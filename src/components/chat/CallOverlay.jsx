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

  // Used to dismiss declined-call UI
  onCallDismiss,

  // ============================================================
  // NEW
  // Only the caller should set this to true after receiver
  // rejects the call.
  // ============================================================
  showDeclinedUI = false,
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
  // AUTO DISMISS DECLINED CALL
  // ============================================================

  useEffect(() => {
    if (
      callState !== "declined" ||
      !showDeclinedUI
    ) {
      return;
    }

    const timer = setTimeout(() => {
      onCallDismiss?.();
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [
    callState,
    showDeclinedUI,
    onCallDismiss,
  ]);

  // ============================================================
  // IDLE
  // ============================================================

  if (callState === "idle") {
    return null;
  }

  // ============================================================
  // RESOLVE REMOTE USER
  // ============================================================

  const incomingCaller =
    incomingCall?.caller || null;

  const conversationMember = (
    activeConversation?.members || []
  ).find(
    (member) =>
      Number(
        member?.userId ??
          member?.user?.id ??
          member?.id
      ) !== Number(currentUser?.id)
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

  const avatar =
    remoteUser?.avatar ||
    remoteUser?.avatarUrl ||
    null;

  const isIncoming =
    callState === "incoming";

  // ============================================================
  // IMPORTANT
  //
  // Declined UI is shown ONLY when:
  //
  // 1. callState is declined
  // 2. showDeclinedUI is true
  //
  // The receiver should keep this false.
  // ============================================================

  const isDeclined =
    callState === "declined" &&
    showDeclinedUI === true;

  const isVideo =
    callType === "video";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) =>
        word.charAt(0).toUpperCase()
      )
      .join("") || "U";

  // ============================================================
  // DECLINED CALL
  //
  // ONLY SHOWN ON CALLER/SENDER SIDE
  // ============================================================

  if (isDeclined) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#020406]/95 p-4 backdrop-blur-2xl">

        {/* ======================================================
            BACKGROUND GLOW
        ====================================================== */}

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/[0.07] blur-[140px]" />

        <div className="pointer-events-none absolute -left-40 top-0 h-[350px] w-[350px] rounded-full bg-red-500/[0.025] blur-[100px]" />

        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-orange-500/[0.025] blur-[120px]" />

        {/* ======================================================
            CARD
        ====================================================== */}

        <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#11181d]/95 shadow-[0_30px_100px_rgba(0,0,0,0.75)]">

          {/* Top red gradient */}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-red-500/[0.11] via-red-500/[0.03] to-transparent" />

          {/* ====================================================
              CONTENT
          ==================================================== */}

          <div className="relative px-7 pb-8 pt-10 sm:px-8">

            {/* ==================================================
                STATUS
            ================================================== */}

            <div className="mb-8 flex justify-center">

              <div className="flex items-center gap-2 rounded-full border border-red-400/[0.12] bg-red-500/[0.07] px-4 py-2 text-xs font-medium text-red-300">

                <span className="relative flex h-2 w-2">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-40" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />

                </span>

                Call declined

              </div>
            </div>

            {/* ==================================================
                AVATAR
            ================================================== */}

            <div className="relative mx-auto mb-7 h-28 w-28">

              <div className="absolute -inset-4 rounded-full border border-red-400/[0.06]" />

              <div className="absolute -inset-2 rounded-full border border-red-400/[0.10]" />

              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-2xl" />

              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/[0.12] bg-gradient-to-br from-slate-600 to-slate-800 text-3xl font-semibold text-white shadow-[0_0_50px_rgba(239,68,68,0.12)]">

                {avatar ? (
                  <img
                    src={avatar}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}

                <div className="absolute inset-0 bg-black/20" />

                <div className="absolute inset-0 flex items-center justify-center">

                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-red-500 text-lg font-semibold text-white shadow-[0_8px_25px_rgba(239,68,68,0.35)]">
                    ✕
                  </div>

                </div>
              </div>
            </div>

            {/* ==================================================
                NAME
            ================================================== */}

            <div className="text-center">

              <h2 className="truncate text-3xl font-semibold tracking-tight text-white">
                {displayName}
              </h2>

              <p className="mt-2 text-sm text-white/45">
                declined your{" "}
                {isVideo ? "video" : "audio"} call
              </p>

            </div>

            {/* ==================================================
                MESSAGE
            ================================================== */}

            <div className="mt-7 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4">

              <div className="flex items-center justify-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/[0.08] text-base">
                  {isVideo ? "📹" : "📞"}
                </div>

                <div className="text-left">

                  <p className="text-sm font-medium text-white/70">
                    Call not answered
                  </p>

                  <p className="mt-0.5 text-xs text-white/30">
                    {isVideo
                      ? "Your video call was declined."
                      : "Your audio call was declined."}
                  </p>

                </div>

              </div>
            </div>

            {/* ==================================================
                CLOSE
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                onCallDismiss?.()
              }
              className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-sm font-medium text-white/75 transition-all duration-200 hover:bg-white/[0.09] hover:text-white active:scale-[0.98]"
            >
              Close
            </button>

            {/* ==================================================
                AUTO CLOSE
            ================================================== */}

            <p className="mt-3 text-center text-[11px] text-white/25">
              Closing automatically...
            </p>

          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // INCOMING CALL
  // ============================================================

  if (isIncoming) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#05080b]/90 p-4 backdrop-blur-2xl">

        {/* Background */}

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.10] blur-[130px]" />

        <div className="pointer-events-none absolute -right-40 -top-40 h-[350px] w-[350px] rounded-full bg-indigo-500/[0.05] blur-[100px]" />

        {/* Card */}

        <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#11181d]/95 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">

          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-500/[0.12] via-indigo-500/[0.04] to-transparent" />

          <div className="relative px-7 pb-8 pt-9 sm:px-8">

            {/* CALL TYPE */}

            <div className="mb-8 flex justify-center">

              <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60">

                <span
                  className={`relative flex h-2 w-2 ${
                    isVideo
                      ? "text-blue-400"
                      : "text-emerald-400"
                  }`}
                >

                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${
                      isVideo
                        ? "bg-blue-400"
                        : "bg-emerald-400"
                    }`}
                  />

                  <span
                    className={`relative h-2 w-2 rounded-full ${
                      isVideo
                        ? "bg-blue-400"
                        : "bg-emerald-400"
                    }`}
                  />

                </span>

                Incoming{" "}
                {isVideo
                  ? "video"
                  : "audio"}{" "}
                call

              </div>
            </div>

            {/* AVATAR */}

            <div className="relative mx-auto mb-7 h-28 w-28">

              <div className="absolute -inset-5 animate-pulse rounded-full border border-blue-400/[0.08]" />

              <div className="absolute -inset-3 rounded-full border border-blue-400/[0.10]" />

              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/[0.08]" />

              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-semibold text-white shadow-[0_0_60px_rgba(37,99,235,0.30)]">

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

            {/* NAME */}

            <div className="text-center">

              <h2 className="truncate text-3xl font-semibold tracking-tight text-white">
                {displayName}
              </h2>

              <p className="mt-2 text-sm text-white/45">
                is calling you...
              </p>

            </div>

            {/* ACTIONS */}

            <div className="mt-9 grid grid-cols-2 gap-4">

              {/* DECLINE */}

              <button
                type="button"
                onClick={() =>
                  onRejectCall?.("rejected")
                }
                className="group flex h-14 items-center justify-center gap-2 rounded-2xl border border-red-400/[0.10] bg-red-500/[0.10] text-sm font-semibold text-red-400 transition-all duration-200 hover:border-red-400/[0.18] hover:bg-red-500/[0.18] active:scale-[0.97]"
              >

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/[0.12] text-base transition-transform duration-200 group-hover:scale-110">
                  ✕
                </span>

                Decline

              </button>

              {/* ACCEPT */}

              <button
                type="button"
                onClick={onAcceptCall}
                className="group flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.20)] transition-all duration-200 hover:bg-emerald-400 hover:shadow-[0_12px_35px_rgba(16,185,129,0.30)] active:scale-[0.97]"
              >

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.15] text-base transition-transform duration-200 group-hover:scale-110">
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

      {/* REMOTE AUDIO */}

      {!isVideo && (
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
        />
      )}

      {/* MAIN CALL CONTAINER */}

      <div className="relative flex h-full w-full max-w-[1500px] flex-col overflow-hidden bg-[#080d11] shadow-2xl sm:h-[calc(100vh-24px)] sm:rounded-[28px] sm:border sm:border-white/[0.08]">

        {/* BACKGROUND */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">

          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.04] blur-[150px]" />

          <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />

          <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-purple-500/[0.04] blur-[120px]" />

        </div>

        {/* TOP BAR */}

        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-7">

          {/* USER */}

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

                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    callState === "connecting"
                      ? "bg-yellow-400"
                      : "bg-emerald-400"
                  }`}
                />

                {isVideo
                  ? "Video call"
                  : "Audio call"}

              </div>

            </div>
          </div>

          {/* CALL STATUS */}

          <div className="rounded-full border border-white/[0.08] bg-black/25 px-4 py-2 text-xs text-white/55 backdrop-blur-xl">

            {callState === "outgoing" &&
              "Calling..."}

            {callState === "connecting" &&
              "Connecting..."}

            {callState !== "outgoing" &&
              callState !== "connecting" &&
              "Connected"}

          </div>

        </div>

        {/* MAIN DISPLAY */}

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#05090c]">

          {/* REMOTE VIDEO */}

          {isVideo && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (

            <div className="relative flex flex-col items-center justify-center px-6 text-center">

              <div
                className={`absolute h-64 w-64 rounded-full blur-[80px] ${
                  callState === "connecting"
                    ? "bg-blue-500/[0.10]"
                    : "bg-blue-500/[0.15]"
                }`}
              />

              {/* AVATAR */}

              <div className="relative">

                {callState !== "connecting" && (
                  <>
                    <div className="absolute -inset-5 rounded-full border border-blue-400/[0.10]" />

                    <div className="absolute -inset-10 rounded-full border border-blue-400/[0.05]" />
                  </>
                )}

                <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-white/[0.15] bg-gradient-to-br from-blue-500 to-indigo-600 text-5xl font-semibold text-white shadow-[0_0_70px_rgba(37,99,235,0.20)] sm:h-44 sm:w-44 sm:text-6xl">

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

              {/* NAME */}

              <h1 className="relative mt-8 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {displayName}
              </h1>

              {/* STATUS */}

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

          {/* LOCAL VIDEO */}

          {isVideo &&
            localStream &&
            !isCameraOff && (
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

          {/* CAMERA OFF */}

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

          {/* CALL ERROR */}

          {callError && (
            <div className="absolute left-1/2 top-20 z-30 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300 shadow-xl backdrop-blur-xl">
              {callError}
            </div>
          )}

        </div>

        {/* BOTTOM CONTROLS */}

        <div className="relative z-20 shrink-0 border-t border-white/[0.06] bg-[#0b1115]/95 px-4 pb-7 pt-4 backdrop-blur-2xl sm:px-7 sm:pb-8">

          {/* CALL TYPE */}

          <div className="mb-4 text-center">

            <div className="text-xs font-medium text-white/35">
              {isVideo
                ? "Video call"
                : "Audio call"}
            </div>

          </div>

          {/* CONTROLS */}

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
                  {isCameraOff
                    ? "📹"
                    : "🎥"}
                </span>

              </button>
            )}

            {/* END CALL */}

            <button
              type="button"
              onClick={() =>
                onEndCall?.("ended")
              }
              className="ml-1 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-xl text-white shadow-[0_10px_35px_rgba(239,68,68,0.30)] transition-all duration-200 hover:bg-red-400 hover:shadow-[0_12px_40px_rgba(239,68,68,0.40)] active:scale-90 sm:ml-2 sm:h-[68px] sm:w-[68px]"
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