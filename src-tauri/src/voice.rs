//! Escucha tu voz (solo si lo activas en Ajustes; apagado por defecto).
//! Usa el reconocimiento de voz de Windows, que funciona en el propio PC (sin internet) con una lista cerrada de frases.
//! Solo reacciona a voz humana (no a ruidos, palmadas ni música sin voz) y no graba ni guarda nada.
//! Eventos a la ventana principal: "voice" → { kind: "speech" | "end" | "cmd" | "error", text, conf }
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::AppHandle;

#[allow(dead_code)]
#[derive(Serialize, Clone, Debug, Default)]
pub struct VoiceEv {
    pub kind: String,
    pub text: String,
    /// 0 alta · 1 media · 2 baja · 3 rechazada
    pub conf: i32,
}

static RUNNING: AtomicBool = AtomicBool::new(false);
static GEN: AtomicU64 = AtomicU64::new(0);

#[tauri::command]
pub fn voice_start(app: AppHandle, phrases: Vec<String>) {
    let gen = GEN.fetch_add(1, Ordering::SeqCst) + 1;
    RUNNING.store(true, Ordering::SeqCst);
    #[cfg(windows)]
    std::thread::spawn(move || imp::run(app, phrases, gen));
    #[cfg(not(windows))]
    {
        let _ = (app, phrases, gen);
    }
}

#[tauri::command]
pub fn voice_stop() {
    RUNNING.store(false, Ordering::SeqCst);
    GEN.fetch_add(1, Ordering::SeqCst);
}

#[allow(dead_code)]
fn alive(gen: u64) -> bool {
    RUNNING.load(Ordering::SeqCst) && GEN.load(Ordering::SeqCst) == gen
}

#[cfg(windows)]
mod imp {
    use super::{alive, VoiceEv};
    use std::time::Duration;
    use tauri::{AppHandle, Emitter};
    use windows::core::HSTRING;
    use windows::Foundation::{TimeSpan, TypedEventHandler};
    use windows::Media::SpeechRecognition::{
        SpeechContinuousRecognitionCompletedEventArgs, SpeechContinuousRecognitionResultGeneratedEventArgs, SpeechContinuousRecognitionSession, SpeechRecognitionListConstraint, SpeechRecognitionResultStatus,
        SpeechRecognizer, SpeechRecognizerState, SpeechRecognizerStateChangedEventArgs,
    };
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

    fn emit(app: &AppHandle, kind: &str, text: String, conf: i32) {
        let _ = app.emit_to("main", "voice", VoiceEv { kind: kind.into(), text, conf });
    }

    pub fn run(app: AppHandle, phrases: Vec<String>, gen: u64) {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        if let Err(e) = listen(&app, phrases, gen) {
            emit(&app, "error", e.message().to_string(), 3);
        }
    }

    fn listen(app: &AppHandle, phrases: Vec<String>, gen: u64) -> windows::core::Result<()> {
        let rec = SpeechRecognizer::new()?;
        let list: Vec<HSTRING> = phrases.iter().map(|p| HSTRING::from(p.as_str())).collect();
        let iter = windows_collections::IIterable::<HSTRING>::from(list);
        let constraint = SpeechRecognitionListConstraint::CreateWithTag(&iter, &HSTRING::from("eko"))?;
        rec.Constraints()?.Append(&constraint)?;
        let compiled = rec.CompileConstraintsAsync()?.join()?;
        if compiled.Status()? != SpeechRecognitionResultStatus::Success {
            emit(app, "error", "compile".into(), 3);
            return Ok(());
        }
        // Detecta voz (no ruidos): sirve para que te mire cuando hablas
        let a1 = app.clone();
        rec.StateChanged(&TypedEventHandler::<SpeechRecognizer, SpeechRecognizerStateChangedEventArgs>::new(move |_, args| {
            if let Some(a) = args.as_ref() {
                let st = a.State()?;
                if st == SpeechRecognizerState::SpeechDetected {
                    emit(&a1, "speech", String::new(), 0);
                } else if st == SpeechRecognizerState::SoundEnded {
                    emit(&a1, "end", String::new(), 0);
                }
            }
            Ok(())
        }))?;
        let session: SpeechContinuousRecognitionSession = rec.ContinuousRecognitionSession()?;
        let _ = session.SetAutoStopSilenceTimeout(TimeSpan { Duration: 24 * 3600 * 10_000_000 });
        let a2 = app.clone();
        session.ResultGenerated(&TypedEventHandler::<SpeechContinuousRecognitionSession, SpeechContinuousRecognitionResultGeneratedEventArgs>::new(move |_, args| {
            if let Some(a) = args.as_ref() {
                let r = a.Result()?;
                let conf = r.Confidence()?.0;
                if r.Status()? == SpeechRecognitionResultStatus::Success && conf < 3 {
                    emit(&a2, "cmd", r.Text()?.to_string(), conf);
                } else {
                    // te ha oído pero no ha entendido una orden
                    emit(&a2, "nomatch", String::new(), conf);
                }
            }
            Ok(())
        }))?;
        // Si la sesión termina sola (silencio largo, error de audio…), se vuelve a arrancar
        let restart = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let r2 = restart.clone();
        session.Completed(&TypedEventHandler::<SpeechContinuousRecognitionSession, SpeechContinuousRecognitionCompletedEventArgs>::new(move |_, _| {
            r2.store(true, std::sync::atomic::Ordering::SeqCst);
            Ok(())
        }))?;
        session.StartAsync()?.join()?;
        // Mientras siga activo: si la sesión se para sola, la vuelve a arrancar
        while alive(gen) {
            std::thread::sleep(Duration::from_millis(1000));
            let idle = rec.State().map(|s| s == SpeechRecognizerState::Idle).unwrap_or(false);
            if alive(gen) && (idle || restart.swap(false, std::sync::atomic::Ordering::SeqCst)) {
                std::thread::sleep(Duration::from_millis(300));
                let _ = session.StartAsync().and_then(|op| op.join());
            }
        }
        let _ = session.StopAsync().and_then(|op| op.join());
        Ok(())
    }
}
