package com.m3.logger;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Timer;
import java.util.TimerTask;

/**
 * M3 Log Server SDK for Android
 * 
 * Usage:
 *   M3Logger logger = new M3Logger("http://localhost:3000", "android-app");
 *   logger.init(10); // batch size of 10
 *   logger.log("INFO", "trace-123", "Activity started");
 */
public class M3Logger {
    private String endpoint;
    private String source;
    private int batchCount;
    private List<String> buffer;
    private Timer autoFlushTimer;
    private SimpleDateFormat dateFormat;
    private SimpleDateFormat timeFormat;

    public M3Logger(String endpoint, String source) {
        this.endpoint = endpoint;
        this.source = source != null ? source : "android-app";
        this.batchCount = 1;
        this.buffer = new ArrayList<>();
        this.dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        this.timeFormat = new SimpleDateFormat("HH:mm:ss", Locale.US);
    }

    /**
     * Initialize the logger
     * @param batchCount Number of logs to batch before sending (default: 1)
     */
    public void init(int batchCount) {
        this.batchCount = batchCount;
        
        // Auto-flush every 5 seconds if there are buffered logs
        autoFlushTimer = new Timer();
        autoFlushTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                if (!buffer.isEmpty()) {
                    flush();
                }
            }
        }, 5000, 5000);
    }

    /**
     * Log a message
     * @param level Log level (ERROR, WARN, INFO, DEBUG)
     * @param traceId Trace ID for tracking
     * @param content Log content
     */
    public void log(String level, String traceId, String content) {
        Date now = new Date();
        String date = dateFormat.format(now);
        String time = timeFormat.format(now);

        // Escape content: backslashes to \\, newlines to \n
        String escapedContent = content
            .replace("\\", "\\\\")
            .replace("\n", "\\n");

        String logLine = date + "\t" + time + "\t" + level + "\t" + 
                        (traceId != null ? traceId : "") + "\t" + escapedContent;

        synchronized (buffer) {
            buffer.add(logLine);

            if (buffer.size() >= batchCount) {
                flush();
            }
        }
    }

    /**
     * Flush buffered logs to server
     */
    public void flush() {
        List<String> logs;
        synchronized (buffer) {
            if (buffer.isEmpty()) return;
            logs = new ArrayList<>(buffer);
            buffer.clear();
        }

        new Thread(() -> {
            try {
                JSONObject data = new JSONObject();
                data.put("source", source);
                
                JSONArray logsArray = new JSONArray();
                for (String log : logs) {
                    logsArray.put(log);
                }
                data.put("logs", logsArray);

                URL url = new URL(endpoint + "/api/logs");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write(data.toString().getBytes("UTF-8"));
                os.close();

                int responseCode = conn.getResponseCode();
                if (responseCode != 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
                    String line;
                    StringBuilder response = new StringBuilder();
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    System.err.println("Failed to send logs: " + response.toString());
                }

                conn.disconnect();
            } catch (Exception e) {
                System.err.println("Error sending logs: " + e.getMessage());
                // Re-add logs to buffer on error
                synchronized (buffer) {
                    buffer.addAll(0, logs);
                }
            }
        }).start();
    }

    /**
     * Close the logger and flush remaining logs
     */
    public void close() {
        if (autoFlushTimer != null) {
            autoFlushTimer.cancel();
        }
        flush();
    }
}
