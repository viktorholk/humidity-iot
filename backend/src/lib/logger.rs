use std::env;
use std::path::PathBuf;
use chrono::Local;
use log::LevelFilter;
use fern::colors::{Color, ColoredLevelConfig};

pub fn setup_logger() -> Result<(), fern::InitError> {
    let log_level = env::var("RUST_LOG")
        .unwrap_or_else(|_| "info".to_string())
        .parse::<LevelFilter>()
        .unwrap_or(LevelFilter::Info);

    let colors = ColoredLevelConfig::new()
        .error(Color::Red)
        .warn(Color::Yellow)
        .info(Color::Green)
        .debug(Color::Blue)
        .trace(Color::White);

    let log_path = {
        let mut path = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        path.push("logs");
        std::fs::create_dir_all(&path)?;
        path.push("backend.log");
        path
    };

    let base_config = fern::Dispatch::new()
        .level(log_level);

    let file_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "{} [{}] [{}] {}",
                Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.target(),
                record.level(),
                message
            ))
        })
        .chain(fern::log_file(log_path)?);

    let stdout_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "{} [{}] [{}] {}",
                Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.target(),
                colors.color(record.level()),
                message
            ))
        })
        .chain(std::io::stdout());

    // Combine all outputs
    base_config
        .chain(file_config)
        .chain(stdout_config)
        .apply()?;

    Ok(())
} 
