import { Mic, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { clock } from "@/lib/format";

export type RecordingResult = {
  url: string;
  blob: Blob;
  mimeType: string;
  seconds: number;
};

type Props = {
  onFinished: (result: RecordingResult | null) => void;
};

export function VoiceRecorder({ onFinished }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );
    return () => {
      if (tick.current) clearInterval(tick.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startTimer = () => {
    setSeconds(0);
    elapsed.current = 0;
    tick.current = setInterval(() => {
      elapsed.current += 1;
      setSeconds(elapsed.current);
    }, 1000);
  };
  const stopTimer = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  };

  async function start() {
    if (!supported) {
      setState("done");
      onFinished(null);
      toast("Gravação indisponível neste navegador. Você pode escrever ou revisar o texto.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = mr.mimeType || "audio/webm";
        if (!chunks.current.length) {
          setAudioUrl(null);
          setState("done");
          onFinished(null);
          return;
        }
        const blob = new Blob(chunks.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("done");
        onFinished({ url, blob, mimeType, seconds: elapsed.current });
      };
      recorder.current = mr;
      mr.start();
      setState("recording");
      startTimer();
    } catch {
      toast("Não conseguimos acessar seu microfone. Verifique a permissão e tente novamente.");
      setState("idle");
    }
  }

  function stop() {
    stopTimer();
    recorder.current?.stop();
    if (!recorder.current) {
      setState("done");
      onFinished(null);
    }
  }

  function redo() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSeconds(0);
    setState("idle");
    onFinished(null);
  }

  return (
    <div className="rounded-lg border border-border bg-secondary p-6 text-center">
      {state === "idle" && (
        <>
          <Button
            type="button"
            size="lg"
            onClick={start}
            className="h-14 w-full rounded-full text-base sm:w-auto sm:px-8"
          >
            <Mic className="size-5" aria-hidden="true" />
            Começar a falar
          </Button>
          <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
            {supported === false
              ? "Este navegador não permite gravar áudio. Use a aba “Escrever” — o resultado é o mesmo."
              : "Fale como você falaria com alguém de confiança. Pode pausar, repetir, mudar de ideia."}
          </p>
        </>
      )}

      {state === "recording" && (
        <>
          <p aria-live="polite" className="font-display text-4xl font-semibold text-primary">
            {clock(seconds)}
          </p>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
            Gravando
          </p>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={stop}
            className="mt-6 h-12 w-full rounded-full sm:w-auto sm:px-8"
          >
            <Square className="size-4" aria-hidden="true" />
            Parar
          </Button>
        </>
      )}

      {state === "done" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">
            Gravação concluída {seconds > 0 && <span>· {clock(seconds)}</span>}
          </p>
          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full" aria-label="Ouvir novamente" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem áudio salvo neste navegador. O texto abaixo pode ser ajustado normalmente.
            </p>
          )}
          <Button type="button" variant="ghost" onClick={redo} className="min-h-11">
            <RotateCcw className="size-4" aria-hidden="true" />
            Refazer
          </Button>
        </div>
      )}
    </div>
  );
}
