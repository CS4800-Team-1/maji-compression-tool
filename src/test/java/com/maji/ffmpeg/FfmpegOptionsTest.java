package com.maji.ffmpeg;

import org.junit.Test;
import java.util.List;
import static org.junit.Assert.*;

public class FfmpegOptionsTest {

    @Test
    public void buildTranscodeArgs_validInputs_matchTestingJsFlags() {
        System.out.println("Running test: buildTranscodeArgs_validInputs_matchTestingJsFlags");
        List<String> args = FfmpegOptions.buildTranscodeArgs(
            "input.webm", 28, "ultrafast", 128, "output.mp4");

        assertEquals(13, args.size());
        assertEquals("-i", args.get(0));
        assertEquals("input.webm", args.get(1));
        assertEquals("-c:v", args.get(2));
        assertEquals("libx264", args.get(3));
        assertEquals("-crf", args.get(4));
        assertEquals("28", args.get(5));
        assertEquals("-preset", args.get(6));
        assertEquals("ultrafast", args.get(7));
        assertEquals("-c:a", args.get(8));
        assertEquals("aac", args.get(9));
        assertEquals("-b:a", args.get(10));
        assertEquals("128k", args.get(11));
        assertEquals("output.mp4", args.get(12));
        System.out.println("✅ Passed: valid inputs produced correct ffmpeg args\n");
    }

    @Test(expected = IllegalArgumentException.class)
    public void buildTranscodeArgs_invalidCrf_throws() {
        System.out.println("Running test: buildTranscodeArgs_invalidCrf_throws");
        FfmpegOptions.buildTranscodeArgs("input.webm", 99, "ultrafast", 128, "output.mp4");
    }

    @Test(expected = IllegalArgumentException.class)
    public void buildTranscodeArgs_invalidPreset_throws() {
        System.out.println("Running test: buildTranscodeArgs_invalidPreset_throws");
        FfmpegOptions.buildTranscodeArgs("input.webm", 28, "warp-speed", 128, "output.mp4");
    }

    @Test(expected = IllegalArgumentException.class)
    public void buildTranscodeArgs_zeroAudioKbps_throws() {
        System.out.println("Running test: buildTranscodeArgs_zeroAudioKbps_throws");
        FfmpegOptions.buildTranscodeArgs("input.webm", 28, "ultrafast", 0, "output.mp4");
    }

    @Test(expected = IllegalArgumentException.class)
    public void buildTranscodeArgs_missingOutput_throws() {
        System.out.println("Running test: buildTranscodeArgs_missingOutput_throws");
        FfmpegOptions.buildTranscodeArgs("input.webm", 28, "ultrafast", 128, "");
    }
}
