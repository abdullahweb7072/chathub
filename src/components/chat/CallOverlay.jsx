"use client";

import { useEffect, useRef } from "react";

export default function CallOverlay({
  callState = "idle",
  callType = "audio",
  incomingCall = null,
  currentUser = null,
  activeConversation = null,
  localStream = null,
  remoteStream = null,
  isMuted = false,
  isCameraOff = false,
  callError = null,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleCallMute,
  onToggleCallCamera,
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach Remote Stream (Video or Audio)
  useEffect(() => {
    if (callType === "video" && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    } else if (callType === "audio" && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }

    return () => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    };
  }, [remoteStream, callType]);

  // Attach Local Stream
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }

    return () => {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };
  }, [localStream]);

  if (callState === "idle") {
    return null;
  }

  // Resolve Remote User Information safely
  const incomingCaller = incomingCall?.caller || null;

  const conversationMember = (activeConversation?.members || []).find(
    (member) =>
      Number(member?.userId ?? member?.user?.id ?? member?.id) !==
      Number(currentUser?.id)
  );

  const remoteUser =
    incomingCaller ||
    conversationMember?.user ||
    conversationMember ||
    null;

  const displayName =
    remoteUser?.displayName?.trim() ||
    remoteUser?.username?.trim() ||
    remoteUser?.name?.trim() ||
    remoteUser?.email?.trim() ||
    "User";

  const avatar = remoteUser?.avatar || remoteUser?.avatarUrl || null;

  const isIncoming = callState === "incoming";
  const isVideo = callType === "video";

  // ============================================================
  // INCOMING CALL VIEW
  // ============================================================
  if (isIncoming) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#202c33] p-6 text-white shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#2563eb] text-2xl font-semibold">
              {avatar ? (
                <img
                  src={avatar}
                  alt={`${displayName} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="text-sm text-white/60">
              Incoming {isVideo ? "video" : "audio"} call
            </div>

            <h2 className="mt-1 text-2xl font-semibold">{displayName}</h2>

            <div className="mt-8 flex w-full gap-3">
              <button
                type="button"
                onClick={() => onRejectCall?.("rejected")}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-red-500/15 font-medium text-red-400 transition hover:bg-red-500/25 active:scale-95"
              >
                Decline
              </button>

              <button
                type="button"
                onClick={onAcceptCall}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-emerald-500 font-medium text-white transition hover:bg-emerald-600 active:scale-95"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ACTIVE / OUTGOING / CONNECTING CALL VIEW
  // ============================================================
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-3 sm:p-6">
      {/* Hidden Audio element for remote audio-only playback */}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay playsInline />}

      <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#111b21] shadow-2xl">
        {/* REMOTE VIDEO / AUDIO DISPLAY AREA */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0b141a]">
          {isVideo && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#2563eb] text-4xl font-semibold text-white shadow-lg">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>

              <h2 className="mt-5 text-2xl font-semibold text-white">
                {displayName}
              </h2>

              <p className="mt-1 text-sm text-white/60">
                {callState === "outgoing"
                  ? `Calling ${displayName}...`
                  : callState === "connecting"
                  ? "Connecting..."
                  : isVideo
                  ? "Video call"
                  : "Audio call"}
              </p>
            </div>
          )}

          {/* LOCAL VIDEO PREVIEW PIP */}
          {isVideo && localStream && !isCameraOff && (
            <div className="absolute right-4 top-4 h-32 w-24 overflow-hidden rounded-xl border border-white/20 bg-black shadow-xl sm:h-40 sm:w-56">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* ERROR NOTIFICATION OVERLAY */}
          {callError && (
            <div className="absolute left-1/2 top-4 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-xl bg-red-500/90 px-4 py-3 text-center text-sm text-white shadow-lg">
              {callError}
            </div>
          )}
        </div>

        {/* CALL STATUS BANNER */}
        <div className="flex shrink-0 items-center justify-center bg-[#202c33] px-4 py-3">
          <div className="text-center">
            <div className="font-medium text-white">
              {callState === "outgoing"
                ? "Calling..."
                : callState === "connecting"
                ? "Connecting..."
                : "Call connected"}
            </div>
            <div className="text-xs text-white/50">
              {isVideo ? "Video call" : "Audio call"}
            </div>
          </div>
        </div>

        {/* ACTION CONTROLS */}
        <div className="flex shrink-0 items-center justify-center gap-3 bg-[#202c33] px-4 pb-6 pt-3 sm:gap-4">
          {/* MUTE BUTTON */}
          <button
            type="button"
            onClick={onToggleCallMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl text-white transition active:scale-95 ${
              isMuted
                ? "bg-red-500/80 hover:bg-red-600"
                : "bg-white/10 hover:bg-white/20"
            }`}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>

          {/* CAMERA TOGGLE BUTTON (VIDEO ONLY) */}
          {isVideo && (
            <button
              type="button"
              onClick={onToggleCallCamera}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-xl text-white transition active:scale-95 ${
                isCameraOff
                  ? "bg-red-500/80 hover:bg-red-600"
                  : "bg-white/10 hover:bg-white/20"
              }`}
              aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
              title={isCameraOff ? "Turn camera on" : "Turn camera off"}
            >
              {isCameraOff ? "📹" : "🎥"}
            </button>
          )}

          {/* END CALL BUTTON */}
          <button
            type="button"
            onClick={() => onEndCall?.("ended")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-xl text-white transition hover:bg-red-600 active:scale-95"
            aria-label="End call"
            title="End call"
          >
            📵
          </button>
        </div>
      </div>
    </div>
  );
}