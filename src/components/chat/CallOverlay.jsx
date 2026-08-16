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

  // ============================================================
  // ATTACH REMOTE STREAM
  // ============================================================

  useEffect(() => {
    if (callType === "video" && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }

    if (callType === "audio" && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }

    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, [remoteStream, callType]);

  // ============================================================
  // ATTACH LOCAL STREAM
  // ============================================================

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }

    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [localStream]);

  // ============================================================
  // IDLE
  // ============================================================

  if (callState === "idle") {
    return null;
  }

  // ============================================================
  // RESOLVE REMOTE USER
  // ============================================================

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

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "U";

  // ============================================================
  // INCOMING CALL
  // ============================================================

  if (isIncoming) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#05080b]/90 p-4 backdrop-blur-2xl">
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#11181d]/95 shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
          {/* Top gradient */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-500/10 to-transparent" />

          <div className="relative px-7 pb-8 pt-9">
            {/* Call type */}
            <div className="mb-8 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/60">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isVideo ? "bg-blue-400" : "bg-emerald-400"
                  } animate-pulse`}
                />

                Incoming {isVideo ? "video" : "audio"} call
              </div>
            </div>

            {/* Avatar */}
            <div className="relative mx-auto mb-6 h-28 w-28">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/10" />

              <div className="absolute inset-1 flex items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-semibold text-white shadow-[0_0_50px_rgba(37,99,235,0.3)]">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
            </div>

            {/* Name */}
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                {displayName}
              </h2>

              <p className="mt-2 text-sm text-white/45">
                is calling you...
              </p>
            </div>

            {/* Actions */}
            <div className="mt-9 grid grid-cols-2 gap-4">
              {/* Decline */}
              <button
                type="button"
                onClick={() => onRejectCall?.("rejected")}
                className="group flex h-14 items-center justify-center gap-2 rounded-2xl border border-red-400/10 bg-red-500/10 text-sm font-semibold text-red-400 transition-all duration-200 hover:bg-red-500/20 active:scale-[0.97]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-base">
                  ✕
                </span>

                Decline
              </button>

              {/* Accept */}
              <button
                type="button"
                onClick={onAcceptCall}
                className="group flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all duration-200 hover:bg-emerald-400 active:scale-[0.97]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-base">
                  ✓
                </span>

                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ACTIVE / OUTGOING / CONNECTING
  // ============================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#020406] p-0 sm:p-3">
      {/* Remote audio */}
      {!isVideo && (
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
        />
      )}

      <div className="relative flex h-full w-full max-w-[1500px] flex-col overflow-hidden bg-[#080d11] shadow-2xl sm:h-[calc(100vh-24px)] sm:rounded-[28px] sm:border sm:border-white/[0.08]">
        {/* ======================================================
            BACKGROUND
        ====================================================== */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.04] blur-[150px]" />

          <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />

          <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-purple-500/[0.04] blur-[120px]" />
        </div>

        {/* ======================================================
            TOP BAR
        ====================================================== */}

        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-7">
          {/* User info */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/25 px-3 py-2 backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white">
              {avatar ? (
                <img
                  src={avatar}
                  alt={`${displayName} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="hidden sm:block">
              <div className="max-w-[180px] truncate text-sm font-medium text-white">
                {displayName}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                {isVideo ? "Video call" : "Audio call"}
              </div>
            </div>
          </div>

          {/* Call state */}
          <div className="rounded-full border border-white/[0.08] bg-black/25 px-4 py-2 text-xs text-white/55 backdrop-blur-xl">
            {callState === "outgoing" && "Calling..."}
            {callState === "connecting" && "Connecting..."}
            {callState !== "outgoing" &&
              callState !== "connecting" &&
              "Connected"}
          </div>
        </div>

        {/* ======================================================
            MAIN DISPLAY
        ====================================================== */}

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#05090c]">
          {/* VIDEO */}
          {isVideo && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            /* AUDIO / CONNECTING DISPLAY */
            <div className="relative flex flex-col items-center justify-center px-6 text-center">
              {/* Glow */}
              <div
                className={`absolute h-64 w-64 rounded-full blur-[80px] ${
                  callState === "connecting"
                    ? "bg-blue-500/10"
                    : "bg-blue-500/15"
                }`}
              />

              {/* Avatar rings */}
              <div className="relative">
                {callState !== "connecting" && (
                  <>
                    <div className="absolute -inset-5 rounded-full border border-blue-400/10" />
                    <div className="absolute -inset-10 rounded-full border border-blue-400/5" />
                  </>
                )}

                <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-blue-500 to-indigo-600 text-5xl font-semibold text-white shadow-[0_0_70px_rgba(37,99,235,0.2)] sm:h-44 sm:w-44 sm:text-6xl">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={`${displayName} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </div>

              {/* Name */}
              <h1 className="relative mt-8 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {displayName}
              </h1>

              {/* Status */}
              <div className="relative mt-3 flex items-center gap-2 text-sm text-white/45">
                {callState === "outgoing" && (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                    Calling {displayName}...
                  </>
                )}

                {callState === "connecting" && (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
                    Connecting...
                  </>
                )}

                {callState !== "outgoing" &&
                  callState !== "connecting" && (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Connected
                    </>
                  )}
              </div>
            </div>
          )}

          {/* ====================================================
              LOCAL VIDEO PIP
          ==================================================== */}

          {isVideo && localStream && !isCameraOff && (
            <div className="absolute right-4 top-20 z-10 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-[0_15px_40px_rgba(0,0,0,0.5)] sm:right-7 sm:top-24 sm:h-40 sm:w-60">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

              <div className="absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/70 backdrop-blur-md">
                You
              </div>
            </div>
          )}

          {/* Camera off PIP */}
          {isVideo && isCameraOff && (
            <div className="absolute right-4 top-20 z-10 flex h-32 w-24 items-center justify-center rounded-2xl border border-white/10 bg-[#11181d] shadow-xl sm:right-7 sm:top-24 sm:h-40 sm:w-60">
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg">
                  📷
                </div>

                <p className="mt-2 text-[10px] text-white/40">
                  Camera off
                </p>
              </div>
            </div>
          )}

          {/* ====================================================
              ERROR
          ==================================================== */}

          {callError && (
            <div className="absolute left-1/2 top-20 z-30 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300 shadow-xl backdrop-blur-xl">
              {callError}
            </div>
          )}
        </div>

        {/* ======================================================
            BOTTOM CONTROLS
        ====================================================== */}

        <div className="relative z-20 shrink-0 border-t border-white/[0.06] bg-[#0b1115]/95 px-4 pb-7 pt-4 backdrop-blur-2xl sm:px-7 sm:pb-8">
          {/* Status */}
          <div className="mb-4 text-center">
            <div className="text-xs font-medium text-white/35">
              {isVideo ? "Video call" : "Audio call"}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* MUTE */}
            <button
              type="button"
              onClick={onToggleCallMute}
              className={`group flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-200 active:scale-90 sm:h-16 sm:w-16 ${
                isMuted
                  ? "border-red-400/20 bg-red-500/20 text-red-300"
                  : "border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.12]"
              }`}
              aria-label={
                isMuted
                  ? "Unmute microphone"
                  : "Mute microphone"
              }
              title={
                isMuted
                  ? "Unmute microphone"
                  : "Mute microphone"
              }
            >
              <span className="text-xl">
                {isMuted ? "🔇" : "🎤"}
              </span>
            </button>

            {/* CAMERA */}
            {isVideo && (
              <button
                type="button"
                onClick={onToggleCallCamera}
                className={`group flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-200 active:scale-90 sm:h-16 sm:w-16 ${
                  isCameraOff
                    ? "border-red-400/20 bg-red-500/20 text-red-300"
                    : "border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.12]"
                }`}
                aria-label={
                  isCameraOff
                    ? "Turn camera on"
                    : "Turn camera off"
                }
                title={
                  isCameraOff
                    ? "Turn camera on"
                    : "Turn camera off"
                }
              >
                <span className="text-xl">
                  {isCameraOff ? "📹" : "🎥"}
                </span>
              </button>
            )}

            {/* END CALL */}
            <button
              type="button"
              onClick={() => onEndCall?.("ended")}
              className="ml-1 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-xl text-white shadow-[0_10px_35px_rgba(239,68,68,0.3)] transition-all duration-200 hover:bg-red-400 active:scale-90 sm:ml-2 sm:h-[68px] sm:w-[68px]"
              aria-label="End call"
              title="End call"
            >
              <span className="rotate-[135deg] text-2xl">
                📞
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}