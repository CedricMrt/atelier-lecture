import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { db } from "../db/db";
import "./ScanCardPage.css";

export default function ScanCardPage() {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const startingRef = useRef(false);
  const processingRef = useRef(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const releaseCamera = () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeScanner = () => {
    // Invalide aussi une demande de caméra encore en attente.
    requestIdRef.current += 1;
    startingRef.current = false;
    processingRef.current = false;

    releaseCamera();

    setStarting(false);
    setCameraActive(false);
    setScannerOpen(false);
    setError(null);
  };

  const openManualLogin = () => {
    closeScanner();
    navigate("/manual-login");
  };

  const handleToken = async (token: string, requestId: number) => {
    if (processingRef.current) return;

    processingRef.current = true;
    releaseCamera();

    if (mountedRef.current) {
      setCameraActive(false);
    }

    try {
      const student = await db.students
        .where("qrToken")
        .equals(token.trim())
        .first();

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      if (!student) {
        setError(
          "Cette carte n’est pas reconnue. Réessaie ou choisis ton prénom.",
        );
        return;
      }

      navigate(`/confirm/${encodeURIComponent(student.id)}`);
    } catch (err) {
      console.error("Lecture de la carte impossible :", err);

      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(
          "Impossible de retrouver ton profil. Réessaie dans un instant.",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        processingRef.current = false;
      }
    }
  };

  const scanLoop = (requestId: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error("La fenêtre de scan n’est pas disponible.");
    }

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      throw new Error("Le lecteur de carte n’est pas disponible.");
    }

    const scan = () => {
      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current ||
        !streamRef.current
      ) {
        return;
      }

      try {
        if (
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          // Limite la taille de travail pour le décodage.
          const ratio = Math.min(1, 640 / video.videoWidth);

          const width = Math.round(video.videoWidth * ratio);
          const height = Math.round(video.videoHeight * ratio);

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          context.drawImage(video, 0, 0, width, height);

          const imageData = context.getImageData(0, 0, width, height);

          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code?.data) {
            void handleToken(code.data, requestId);
            return;
          }
        }

        animationRef.current = requestAnimationFrame(scan);
      } catch (err) {
        console.error("Erreur du lecteur QR :", err);

        releaseCamera();

        if (mountedRef.current && requestId === requestIdRef.current) {
          setCameraActive(false);
          setError("Le scan a été interrompu. Tu peux réessayer.");
        }
      }
    };

    animationRef.current = requestAnimationFrame(scan);
  };

  const startCamera = async () => {
    if (startingRef.current || processingRef.current) return;

    const requestId = ++requestIdRef.current;

    startingRef.current = true;

    releaseCamera();

    setError(null);
    setScannerOpen(true);
    setCameraActive(false);
    setStarting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "La caméra n’est pas accessible. Vérifie que la page utilise HTTPS.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error("La fenêtre de caméra est introuvable.");
      }

      video.srcObject = stream;
      await video.play();

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setCameraActive(true);
      scanLoop(requestId);
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      releaseCamera();
      setCameraActive(false);

      console.error("Erreur caméra :", err);

      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            setError(
              "L’accès à la caméra est refusé. Tu peux te connecter avec ton prénom.",
            );
            break;

          case "NotFoundError":
            setError("Aucune caméra n’a été trouvée sur cette tablette.");
            break;

          case "NotReadableError":
            setError(
              "La caméra est indisponible ou utilisée par une autre application.",
            );
            break;

          default:
            setError("Impossible de démarrer la caméra.");
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de démarrer la caméra.",
        );
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        startingRef.current = false;
        setStarting(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    };
  }, []);

  return (
    <main className='adventure-home'>
      <div className='adventure-home__shade' />

      <header className='adventure-home__header'>
        <p className='adventure-home__eyebrow'>Ton aventure commence ici</p>

        <h1>Atelier Lecture</h1>

        <p className='adventure-home__subtitle'>
          Des îles à explorer, des défis à relever !
        </p>
      </header>

      <section className='adventure-home__content'>
        <div className='adventure-home__hero' aria-hidden='true'>
          <div className='adventure-home__speech'>Prêt pour l’aventure ?</div>

          <img
            className='adventure-home__avatar'
            src='/tambour-des-sons/images/avatar-acceuil.png'
            alt=''
            draggable={false}
          />
        </div>

        <div className='adventure-home__panel'>
          <span className='adventure-home__compass' aria-hidden='true'>
            ✦
          </span>

          <h2>Bienvenue, explorateur !</h2>

          <p>
            Présente ta carte pour retrouver ton personnage et partir à la
            découverte des îles.
          </p>

          <button
            type='button'
            className='adventure-home__button adventure-home__button--gold'
            onClick={() => void startCamera()}
          >
            <span aria-hidden='true'>▣</span>
            Scanner ma carte
          </button>

          <button
            type='button'
            className='adventure-home__button adventure-home__button--teal'
            onClick={openManualLogin}
          >
            Je n’ai pas ma carte
          </button>

          <p className='adventure-home__hint'>
            Pas de carte ? Choisis simplement ton prénom.
          </p>
        </div>
      </section>

      <footer className='adventure-home__footer'>
        Écoute • Joue • Explore
      </footer>

      <div className='adventure-scan' hidden={!scannerOpen}>
        <section
          className='adventure-scan__dialog'
          role='dialog'
          aria-modal='true'
          aria-labelledby='scan-title'
        >
          <button
            type='button'
            className='adventure-scan__close'
            onClick={closeScanner}
            aria-label='Fermer le scan'
          >
            ×
          </button>

          <h2 id='scan-title'>Scanne ta carte</h2>

          <p>Place le QR code dans le cadre.</p>

          <div className='adventure-scan__preview'>
            <video ref={videoRef} playsInline muted autoPlay />

            {cameraActive && (
              <div className='adventure-scan__target' aria-hidden='true' />
            )}

            {!cameraActive && (
              <div className='adventure-scan__placeholder'>
                {starting
                  ? "Ouverture de la caméra…"
                  : error
                    ? "La caméra est arrêtée"
                    : "Préparation du lecteur…"}
              </div>
            )}
          </div>

          {error && (
            <p className='adventure-scan__error' role='alert'>
              {error}
            </p>
          )}

          {cameraActive && (
            <p className='adventure-scan__status' role='status'>
              Recherche de ta carte…
            </p>
          )}

          <div className='adventure-scan__actions'>
            {error && (
              <button
                type='button'
                className='adventure-home__button adventure-home__button--gold'
                onClick={() => void startCamera()}
                disabled={starting}
              >
                Réessayer
              </button>
            )}

            <button
              type='button'
              className='adventure-home__button adventure-home__button--teal'
              onClick={openManualLogin}
            >
              Choisir mon prénom
            </button>
          </div>
        </section>
      </div>

      <canvas ref={canvasRef} hidden />
    </main>
  );
}
