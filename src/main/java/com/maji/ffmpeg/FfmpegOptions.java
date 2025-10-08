package com.maji.ffmpeg;

import java.util.*;

public final class FfmpegOptions {
    private static final List<String> VALID_PRESETS = Arrays.asList(
        "ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"
    );
    private FfmpegOptions() {}
    /** Mirrors the flags used in pages/testing.js */
    public static List<String> buildTranscodeArgs(
            String inputFile, int crf, String preset, int audioKbps, String outputFile) {
        if (inputFile == null || inputFile.trim().isEmpty()) throw new IllegalArgumentException("inputFile required");
        if (outputFile == null || outputFile.trim().isEmpty()) throw new IllegalArgumentException("outputFile required");
        if (crf < 0 || crf > 51) throw new IllegalArgumentException("crf must be 0..51");
        if (audioKbps <= 0) throw new IllegalArgumentException("audioKbps must be > 0");
        Objects.requireNonNull(preset, "preset required");
        if (!VALID_PRESETS.contains(preset)) throw new IllegalArgumentException("invalid preset: " + preset);

        return Collections.unmodifiableList(Arrays.asList(
            "-i", inputFile,
            "-c:v", "libx264",
            "-crf", String.valueOf(crf),
            "-preset", preset,
            "-c:a", "aac",
            "-b:a", audioKbps + "k",
            outputFile
        ));
    }
}
