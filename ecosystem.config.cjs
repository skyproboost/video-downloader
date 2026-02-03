/**
 * PM2 Configuration
 */
module.exports = {
    apps: [
        {
            name: 'video-downloader',
            script: '.output/server/index.mjs',

            // Кластер для zero-downtime reload
            instances: 'max',
            exec_mode: 'cluster',

            // Окружение
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
                HOST: '0.0.0.0',
            },

            // Память
            max_memory_restart: '500M',
            node_args: '--max-old-space-size=512',

            // Graceful shutdown
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,

            // Перезапуск
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 3000,

            // Логи
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            merge_logs: true,

            // Production
            source_map_support: false,
            vizion: false,
        },
    ],
}