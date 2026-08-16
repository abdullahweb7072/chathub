"use client";

import { socket } from "@/lib/socket";

// ============================================================
// WEBRTC CONFIG
// ============================================================

const ICE_SERVERS = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
        {
            urls: "stun:stun1.l.google.com:19302",
        },
    ],
};

// ============================================================
// CALL MANAGER
// ============================================================

class CallManager {
    constructor() {
        // --------------------------------------------------------
        // WEBRTC
        // --------------------------------------------------------

        this.peerConnection = null;

        // --------------------------------------------------------
        // MEDIA
        // --------------------------------------------------------

        this.localStream = null;
        this.remoteStream = null;

        // --------------------------------------------------------
        // CALL
        // --------------------------------------------------------

        this.callId = null;
        this.conversationId = null;

        this.currentUserId = null;
        this.remoteUserId = null;

        this.callType = "audio";

        // --------------------------------------------------------
        // STATE
        // --------------------------------------------------------

        this.isCallActive = false;
        this.isIncomingCall = false;

        this.isMuted = false;
        this.isCameraOff = false;

        // --------------------------------------------------------
        // ICE
        // --------------------------------------------------------

        this.pendingIceCandidates = [];

        // --------------------------------------------------------
        // CALLER
        // --------------------------------------------------------

        this.caller = null;

        // --------------------------------------------------------
        // SOCKET
        // --------------------------------------------------------

        this.socketListenersRegistered = false;

        // --------------------------------------------------------
        // CALLBACKS
        // --------------------------------------------------------

        this.callbacks = {
            onIncomingCall: null,
            onCallAccepted: null,
            onCallRejected: null,
            onCallEnded: null,

            onLocalStream: null,
            onRemoteStream: null,

            onCallStarted: null,
            onCallConnected: null,

            onCallError: null,

            onMuteChanged: null,
            onCameraChanged: null,
        };
    }

    // ============================================================
    // INITIALIZE
    // ============================================================

    initialize(userId) {
        this.currentUserId = Number(userId);

        console.log(
            "📞 CallManager initialized:",
            this.currentUserId
        );

        this.registerSocketListeners();
    }

    // ============================================================
    // CALLBACKS
    // ============================================================

    setCallbacks(callbacks = {}) {
        this.callbacks = {
            ...this.callbacks,
            ...callbacks,
        };
    }

    // ============================================================
    // SOCKET LISTENERS
    // ============================================================

    registerSocketListeners() {
        if (this.socketListenersRegistered) {
            return;
        }

        if (!socket) {
            console.error(
                "❌ Socket is unavailable."
            );

            return;
        }

        this.socketListenersRegistered = true;

        // --------------------------------------------------------
        // INCOMING CALL
        // --------------------------------------------------------

        socket.on(
            "incoming_call",
            (data) => {
                console.log(
                    "📞 INCOMING CALL:",
                    data
                );

                this.handleIncomingCall(data);
            }
        );

        // --------------------------------------------------------
        // CALL ACCEPTED
        // --------------------------------------------------------

        socket.on(
            "call_accepted",
            async (data) => {
                console.log(
                    "✅ CALL ACCEPTED:",
                    data
                );

                await this.handleCallAccepted(
                    data
                );
            }
        );

        // --------------------------------------------------------
        // CALL REJECTED
        // --------------------------------------------------------

        socket.on(
            "call_rejected",
            (data) => {
                console.log(
                    "❌ CALL REJECTED:",
                    data
                );

                this.handleCallRejected(data);
            }
        );

        // --------------------------------------------------------
        // WEBRTC OFFER
        // --------------------------------------------------------

        socket.on(
            "webrtc_offer",
            async (data) => {
                console.log(
                    "📡 WEBRTC OFFER RECEIVED:",
                    data
                );

                await this.handleWebRTCOffer(data);
            }
        );

        // --------------------------------------------------------
        // WEBRTC ANSWER
        // --------------------------------------------------------

        socket.on(
            "webrtc_answer",
            async (data) => {
                console.log(
                    "📡 WEBRTC ANSWER RECEIVED:",
                    data
                );

                await this.handleWebRTCAnswer(data);
            }
        );

        // --------------------------------------------------------
        // ICE
        // --------------------------------------------------------

        socket.on(
            "ice_candidate",
            async (data) => {
                console.log(
                    "🧊 ICE CANDIDATE RECEIVED"
                );

                await this.handleIceCandidate(data);
            }
        );

        // --------------------------------------------------------
        // REMOTE END
        // --------------------------------------------------------

        socket.on(
            "call_ended",
            (data) => {
                console.log(
                    "📴 REMOTE CALL ENDED:",
                    data
                );

                this.handleRemoteCallEnded(data);
            }
        );
    }

    // ============================================================
    // START AUDIO
    // ============================================================

    async startAudioCall(
        conversationId,
        receiverId
    ) {
        return this.startCall({
            conversationId,
            receiverId,
            callType: "audio",
        });
    }

    // ============================================================
    // START VIDEO
    // ============================================================

    async startVideoCall(
        conversationId,
        receiverId
    ) {
        return this.startCall({
            conversationId,
            receiverId,
            callType: "video",
        });
    }

    // ============================================================
    // START CALL
    // ============================================================

    async startCall({
        conversationId,
        receiverId,
        callType = "audio",
    }) {
        try {
            const parsedConversationId =
                Number(conversationId);

            const parsedReceiverId =
                Number(receiverId);

            if (
                !Number.isInteger(
                    parsedConversationId
                ) ||
                parsedConversationId <= 0
            ) {
                throw new Error(
                    "Invalid conversation ID."
                );
            }

            if (
                !Number.isInteger(
                    parsedReceiverId
                ) ||
                parsedReceiverId <= 0
            ) {
                throw new Error(
                    "Invalid receiver ID."
                );
            }

            if (
                callType !== "audio" &&
                callType !== "video"
            ) {
                throw new Error(
                    "Invalid call type."
                );
            }

            if (
                this.callId ||
                this.isCallActive
            ) {
                throw new Error(
                    "A call is already in progress."
                );
            }

            if (!socket.connected) {
                throw new Error(
                    "Socket is not connected."
                );
            }

            // ----------------------------------------------------
            // RESET
            // ----------------------------------------------------

            this.resetCallState();

            this.conversationId =
                parsedConversationId;

            this.remoteUserId =
                parsedReceiverId;

            this.callType =
                callType;

            this.isIncomingCall = false;

            // ----------------------------------------------------
            // CAMERA + MICROPHONE
            // ----------------------------------------------------

            await this.getLocalMedia(
                callType
            );

            // ----------------------------------------------------
            // CREATE SERVER CALL
            // ----------------------------------------------------

            const response =
                await new Promise(
                    (resolve) => {
                        socket.emit(
                            "call_user",
                            {
                                conversationId:
                                    parsedConversationId,

                                receiverId:
                                    parsedReceiverId,

                                callType,
                            },
                            resolve
                        );
                    }
                );

            console.log(
                "📞 call_user:",
                response
            );

            if (
                !response?.success
            ) {
                throw new Error(
                    response?.message ||
                        "Unable to start call."
                );
            }

            if (!response.callId) {
                throw new Error(
                    "Server did not return call ID."
                );
            }

            // ----------------------------------------------------
            // IMPORTANT
            // USE SERVER CALL ID
            // ----------------------------------------------------

            this.callId =
                response.callId;

            this.isCallActive = true;

            console.log(
                "📞 CALL CREATED:",
                this.callId
            );

            // ----------------------------------------------------
            // UPDATE UI
            // ----------------------------------------------------

            this.callbacks.onCallStarted?.({
                direction: "outgoing",

                callId:
                    this.callId,

                conversationId:
                    parsedConversationId,

                receiverId:
                    parsedReceiverId,

                callType,
            });

            return {
                success: true,

                callId:
                    this.callId,

                type:
                    callType,

                callType,
            };
        } catch (error) {
            console.error(
                "❌ START CALL ERROR:",
                error
            );

            this.handleCallError(
                error?.message ||
                    "Unable to start call."
            );

            this.cleanup();

            return {
                success: false,

                message:
                    error?.message ||
                    "Unable to start call.",
            };
        }
    }

    // ============================================================
    // GET LOCAL MEDIA
    // ============================================================

    async getLocalMedia(
        callType = "audio"
    ) {
        if (
            typeof navigator ===
            "undefined"
        ) {
            throw new Error(
                "Browser environment required."
            );
        }

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices
                .getUserMedia
        ) {
            throw new Error(
                "Your browser does not support camera/microphone access."
            );
        }

        const constraints =
            callType === "video"
                ? {
                      audio: true,

                      video: {
                          width: {
                              ideal: 1280,
                          },

                          height: {
                              ideal: 720,
                          },

                          facingMode:
                              "user",
                      },
                  }
                : {
                      audio: true,

                      video: false,
                  };

        try {
            console.log(
                "🎥 Requesting media:",
                constraints
            );

            const stream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );

            this.localStream =
                stream;

            this.callbacks.onLocalStream?.(
                stream
            );

            console.log(
                "✅ LOCAL STREAM:",
                stream
            );

            return stream;
        } catch (error) {
            console.error(
                "❌ GET USER MEDIA ERROR:",
                error
            );

            let message =
                "Unable to access your microphone.";

            if (
                error?.name ===
                "NotAllowedError"
            ) {
                message =
                    "Camera/microphone permission was denied.";
            } else if (
                error?.name ===
                "NotFoundError"
            ) {
                message =
                    "No camera or microphone was found.";
            } else if (
                error?.name ===
                "NotReadableError"
            ) {
                message =
                    "Camera or microphone is already being used.";
            } else if (
                error?.name ===
                "SecurityError"
            ) {
                message =
                    "Camera/microphone access is blocked.";
            }

            this.handleCallError(
                message
            );

            throw error;
        }
    }

    // ============================================================
    // CREATE PEER CONNECTION
    // ============================================================

    createPeerConnection() {
        if (
            this.peerConnection
        ) {
            return this.peerConnection;
        }

        console.log(
            "🔗 Creating RTCPeerConnection"
        );

        const peerConnection =
            new RTCPeerConnection(
                ICE_SERVERS
            );

        this.peerConnection =
            peerConnection;

        // --------------------------------------------------------
        // LOCAL TRACKS
        // --------------------------------------------------------

        if (this.localStream) {
            this.localStream
                .getTracks()
                .forEach(
                    (track) => {
                        peerConnection.addTrack(
                            track,
                            this.localStream
                        );
                    }
                );
        }

        // --------------------------------------------------------
        // REMOTE STREAM
        // --------------------------------------------------------

        this.remoteStream =
            new MediaStream();

        peerConnection.ontrack =
            (event) => {
                console.log(
                    "📺 REMOTE TRACK:",
                    event.track.kind
                );

                if (
                    event.streams?.[0]
                ) {
                    this.remoteStream =
                        event.streams[0];
                } else {
                    this.remoteStream.addTrack(
                        event.track
                    );
                }

                this.callbacks.onRemoteStream?.(
                    this.remoteStream
                );
            };

        // --------------------------------------------------------
        // ICE CANDIDATE
        // --------------------------------------------------------

        peerConnection.onicecandidate =
            (event) => {
                if (
                    !event.candidate
                ) {
                    return;
                }

                if (
                    !this.callId ||
                    !this.remoteUserId
                ) {
                    console.warn(
                        "⚠️ Cannot send ICE yet."
                    );

                    return;
                }

                socket.emit(
                    "ice_candidate",
                    {
                        callId:
                            this.callId,

                        conversationId:
                            this.conversationId,

                        receiverId:
                            this.remoteUserId,

                        candidate:
                            event.candidate,
                    }
                );
            };

        // --------------------------------------------------------
        // CONNECTION STATE
        // --------------------------------------------------------

        peerConnection.onconnectionstatechange =
            () => {
                const state =
                    peerConnection.connectionState;

                console.log(
                    "🔗 WEBRTC CONNECTION:",
                    state
                );

                if (
                    state ===
                    "connected"
                ) {
                    this.isCallActive =
                        true;

                    this.callbacks.onCallConnected?.({
                        callId:
                            this.callId,

                        callType:
                            this.callType,
                    });
                }

                if (
                    state ===
                        "failed" ||
                    state ===
                        "disconnected"
                ) {
                    console.warn(
                        "⚠️ WEBRTC CONNECTION LOST:",
                        state
                    );
                }

                if (
                    state ===
                    "closed"
                ) {
                    console.log(
                        "📴 WEBRTC CLOSED"
                    );
                }
            };

        // --------------------------------------------------------
        // ICE STATE
        // --------------------------------------------------------

        peerConnection.oniceconnectionstatechange =
            () => {
                console.log(
                    "🧊 ICE STATE:",
                    peerConnection.iceConnectionState
                );
            };

        return peerConnection;
    }

    // ============================================================
    // INCOMING CALL
    // ============================================================

    handleIncomingCall(data) {
        if (!data) {
            return;
        }

        const callId =
            data.callId;

        const conversationId =
            Number(
                data.conversationId
            );

        const callerId =
            Number(
                data.callerId ??
                    data.caller?.id
            );

        const receiverId =
            Number(
                data.receiverId
            );

        const callType =
            data.callType ===
            "video"
                ? "video"
                : "audio";

        if (!callId) {
            console.error(
                "❌ Incoming call has no callId."
            );

            return;
        }

        if (
            !Number.isInteger(
                conversationId
            )
        ) {
            return;
        }

        if (
            !Number.isInteger(
                callerId
            )
        ) {
            return;
        }

        // --------------------------------------------------------
        // BUSY
        // --------------------------------------------------------

        if (
            this.callId ||
            this.isCallActive
        ) {
            socket.emit(
                "call_reject",
                {
                    callId,

                    conversationId,

                    reason: "busy",
                }
            );

            return;
        }

        // --------------------------------------------------------
        // STORE
        // --------------------------------------------------------

        this.callId =
            callId;

        this.conversationId =
            conversationId;

        this.remoteUserId =
            callerId;

        this.callType =
            callType;

        this.isIncomingCall =
            true;

        this.isCallActive =
            false;

        this.caller =
            data.caller || {
                id:
                    callerId,
            };

        console.log(
            "📞 INCOMING CALL STORED:",
            {
                callId,
                conversationId,
                callerId,
                callType,
            }
        );

        this.callbacks.onIncomingCall?.({
            callId,

            conversationId,

            callerId,

            receiverId,

            callType,

            caller:
                this.caller,
        });
    }

    // ============================================================
    // ACCEPT CALL
    // ============================================================

    async acceptCall() {
        try {
            if (!this.callId) {
                throw new Error(
                    "No incoming call."
                );
            }

            const callId =
                this.callId;

            const conversationId =
                this.conversationId;

            const callType =
                this.callType ===
                "video"
                    ? "video"
                    : "audio";

            // ----------------------------------------------------
            // GET CAMERA + MICROPHONE
            // ----------------------------------------------------

            await this.getLocalMedia(
                callType
            );

            // ----------------------------------------------------
            // CREATE PEER CONNECTION NOW
            // ----------------------------------------------------
            //
            // The offer may arrive very quickly after
            // call_accept. Creating the peer here makes
            // the receiver ready.
            // ----------------------------------------------------

            this.createPeerConnection();

            // ----------------------------------------------------
            // ACCEPT SERVER CALL
            // ----------------------------------------------------

            socket.emit(
                "call_accept",
                {
                    callId,

                    conversationId,

                    callType,
                }
            );

            this.isIncomingCall =
                false;

            this.isCallActive =
                true;

            this.callbacks.onCallAccepted?.({
                callId,

                conversationId,

                callType,
            });

            console.log(
                "✅ CALL ACCEPTED:",
                callId
            );

            return {
                success: true,

                callId,
            };
        } catch (error) {
            console.error(
                "❌ ACCEPT CALL ERROR:",
                error
            );

            this.handleCallError(
                error?.message ||
                    "Unable to accept call."
            );

            return {
                success: false,

                message:
                    error?.message ||
                    "Unable to accept call.",
            };
        }
    }

    // ============================================================
    // CALL ACCEPTED BY RECEIVER
    // ============================================================

    async handleCallAccepted(
        data
    ) {
        try {
            if (
                !data?.callId
            ) {
                return;
            }

            if (
                this.callId &&
                data.callId !==
                    this.callId
            ) {
                return;
            }

            this.callId =
                data.callId;

            this.conversationId =
                Number(
                    data.conversationId
                );

            this.remoteUserId =
                Number(
                    data.receiverId
                );

            this.callType =
                data.callType ===
                "video"
                    ? "video"
                    : "audio";

            this.isCallActive =
                true;

            this.isIncomingCall =
                false;

            // ----------------------------------------------------
            // MAKE SURE LOCAL MEDIA EXISTS
            // ----------------------------------------------------

            if (
                !this.localStream
            ) {
                await this.getLocalMedia(
                    this.callType
                );
            }

            // ----------------------------------------------------
            // CREATE PEER
            // ----------------------------------------------------

            const peerConnection =
                this.createPeerConnection();

            // ----------------------------------------------------
            // CREATE OFFER
            // ----------------------------------------------------

            console.log(
                "📡 Creating WebRTC offer..."
            );

            const offer =
                await peerConnection.createOffer({
                    offerToReceiveAudio:
                        true,

                    offerToReceiveVideo:
                        this.callType ===
                        "video",
                });

            await peerConnection.setLocalDescription(
                offer
            );

            // ----------------------------------------------------
            // SEND OFFER
            // ----------------------------------------------------

            socket.emit(
                "webrtc_offer",
                {
                    callId:
                        this.callId,

                    conversationId:
                        this.conversationId,

                    receiverId:
                        this.remoteUserId,

                    offer,
                },
                (response) => {
                    if (
                        !response?.success
                    ) {
                        this.handleCallError(
                            response?.message ||
                                "Failed to send offer."
                        );
                    }
                }
            );
        } catch (error) {
            console.error(
                "❌ HANDLE ACCEPTED ERROR:",
                error
            );

            this.handleCallError(
                error?.message ||
                    "Failed to establish call."
            );
        }
    }

    // ============================================================
    // HANDLE OFFER
    // ============================================================

    async handleWebRTCOffer(data) {
        try {
            if (
                !data?.offer ||
                !data?.callId
            ) {
                return;
            }

            if (
                this.callId &&
                data.callId !==
                    this.callId
            ) {
                console.warn(
                    "⚠️ Ignoring offer for another call."
                );

                return;
            }

            this.callId =
                data.callId;

            this.conversationId =
                Number(
                    data.conversationId
                );

            // ====================================================
            // IMPORTANT FIX
            //
            // Server identifies sender as fromUserId.
            // senderId is retained as fallback.
            // ====================================================

            this.remoteUserId =
                Number(
                    data.fromUserId ??
                        data.senderId ??
                        data.callerId
                );

            if (
                !Number.isInteger(
                    this.remoteUserId
                ) ||
                this.remoteUserId <= 0
            ) {
                throw new Error(
                    "Invalid sender ID in WebRTC offer."
                );
            }

            // ----------------------------------------------------
            // CREATE LOCAL MEDIA IF NEEDED
            // ----------------------------------------------------

            if (
                !this.localStream
            ) {
                await this.getLocalMedia(
                    this.callType
                );
            }

            // ----------------------------------------------------
            // PEER
            // ----------------------------------------------------

            const peerConnection =
                this.createPeerConnection();

            // ----------------------------------------------------
            // REMOTE DESCRIPTION
            // ----------------------------------------------------

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.offer
                )
            );

            // ----------------------------------------------------
            // QUEUED ICE
            // ----------------------------------------------------

            await this.flushPendingIceCandidates();

            // ----------------------------------------------------
            // ANSWER
            // ----------------------------------------------------

            const answer =
                await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
                answer
            );

            // ----------------------------------------------------
            // SEND ANSWER
            // ----------------------------------------------------

            socket.emit(
                "webrtc_answer",
                {
                    callId:
                        this.callId,

                    conversationId:
                        this.conversationId,

                    receiverId:
                        this.remoteUserId,

                    answer,
                },
                (response) => {
                    if (
                        !response?.success
                    ) {
                        this.handleCallError(
                            response?.message ||
                                "Failed to send answer."
                        );
                    }
                }
            );
        } catch (error) {
            console.error(
                "❌ HANDLE OFFER ERROR:",
                error
            );

            this.handleCallError(
                error?.message ||
                    "Failed to process video call offer."
            );
        }
    }

    // ============================================================
    // HANDLE ANSWER
    // ============================================================

    async handleWebRTCAnswer(data) {
        try {
            if (
                !data?.answer ||
                !data?.callId
            ) {
                return;
            }

            if (
                this.callId &&
                data.callId !==
                    this.callId
            ) {
                return;
            }

            if (
                !this.peerConnection
            ) {
                console.error(
                    "❌ No peer connection for answer."
                );

                return;
            }

            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.answer
                )
            );

            await this.flushPendingIceCandidates();

            console.log(
                "✅ Remote answer applied."
            );
        } catch (error) {
            console.error(
                "❌ HANDLE ANSWER ERROR:",
                error
            );

            this.handleCallError(
                "Failed to process WebRTC answer."
            );
        }
    }

    // ============================================================
    // HANDLE ICE
    // ============================================================

    async handleIceCandidate(data) {
        try {
            if (
                !data?.candidate ||
                !data?.callId
            ) {
                return;
            }

            if (
                this.callId &&
                data.callId !==
                    this.callId
            ) {
                return;
            }

            // ----------------------------------------------------
            // ICE ARRIVED BEFORE REMOTE DESCRIPTION
            // ----------------------------------------------------

            if (
                !this.peerConnection ||
                !this.peerConnection
                    .remoteDescription
            ) {
                this.pendingIceCandidates.push(
                    data.candidate
                );

                return;
            }

            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(
                    data.candidate
                )
            );
        } catch (error) {
            console.error(
                "❌ ICE ERROR:",
                error
            );
        }
    }

    // ============================================================
    // FLUSH ICE
    // ============================================================

    async flushPendingIceCandidates() {
        if (
            !this.peerConnection ||
            !this.peerConnection
                .remoteDescription
        ) {
            return;
        }

        if (
            !this.pendingIceCandidates
                .length
        ) {
            return;
        }

        const candidates = [
            ...this.pendingIceCandidates,
        ];

        this.pendingIceCandidates =
            [];

        for (
            const candidate of candidates
        ) {
            try {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(
                        candidate
                    )
                );
            } catch (error) {
                console.error(
                    "❌ QUEUED ICE ERROR:",
                    error
                );
            }
        }
    }

    // ============================================================
    // REJECT
    // ============================================================

    rejectCall(
        reason = "rejected"
    ) {
        if (!this.callId) {
            return;
        }

        const callId =
            this.callId;

        const conversationId =
            this.conversationId;

        socket.emit(
            "call_reject",
            {
                callId,

                conversationId,

                reason,
            }
        );

        this.cleanup();
    }

    // ============================================================
    // END CALL
    // ============================================================

    endCall(
        reason = "ended"
    ) {
        const callId =
            this.callId;

        if (callId) {
            socket.emit(
                "call_end",
                {
                    callId,

                    conversationId:
                        this.conversationId,

                    reason,
                }
            );
        }

        this.cleanup();
    }

    // ============================================================
    // REMOTE END
    // ============================================================

    handleRemoteCallEnded(data) {
        if (
            this.callId &&
            data?.callId &&
            data.callId !==
                this.callId
        ) {
            return;
        }

        this.callbacks.onCallEnded?.(
            data
        );

        this.cleanup();
    }

    // ============================================================
    // REJECTED
    // ============================================================

    handleCallRejected(data) {
        if (
            this.callId &&
            data?.callId &&
            data.callId !==
                this.callId
        ) {
            return;
        }

        this.callbacks.onCallRejected?.(
            data
        );

        this.cleanup();
    }

    // ============================================================
    // MUTE
    // ============================================================

    toggleMute() {
        if (
            !this.localStream
        ) {
            return false;
        }

        const tracks =
            this.localStream.getAudioTracks();

        if (!tracks.length) {
            return false;
        }

        this.isMuted =
            !this.isMuted;

        tracks.forEach(
            (track) => {
                track.enabled =
                    !this.isMuted;
            }
        );

        this.callbacks.onMuteChanged?.(
            this.isMuted
        );

        return this.isMuted;
    }

    // ============================================================
    // CAMERA
    // ============================================================

    toggleCamera() {
        if (
            !this.localStream
        ) {
            return false;
        }

        const tracks =
            this.localStream.getVideoTracks();

        if (!tracks.length) {
            return false;
        }

        this.isCameraOff =
            !this.isCameraOff;

        tracks.forEach(
            (track) => {
                track.enabled =
                    !this.isCameraOff;
            }
        );

        this.callbacks.onCameraChanged?.(
            this.isCameraOff
        );

        return this.isCameraOff;
    }

    // ============================================================
    // CALL ERROR
    // ============================================================

    handleCallError(message) {
        console.error(
            "📞 CALL ERROR:",
            message
        );

        this.callbacks.onCallError?.(
            message
        );
    }

    // ============================================================
    // CLEANUP
    // ============================================================

    cleanup() {
        console.log(
            "🧹 Cleaning up call."
        );

        // --------------------------------------------------------
        // STOP LOCAL MEDIA
        // --------------------------------------------------------

        if (
            this.localStream
        ) {
            this.localStream
                .getTracks()
                .forEach(
                    (track) => {
                        try {
                            track.stop();
                        } catch {}
                    }
                );

            this.localStream =
                null;
        }

        // --------------------------------------------------------
        // STOP REMOTE MEDIA
        // --------------------------------------------------------

        if (
            this.remoteStream
        ) {
            this.remoteStream
                .getTracks()
                .forEach(
                    (track) => {
                        try {
                            track.stop();
                        } catch {}
                    }
                );

            this.remoteStream =
                null;
        }

        // --------------------------------------------------------
        // CLOSE PEER
        // --------------------------------------------------------

        if (
            this.peerConnection
        ) {
            try {
                this.peerConnection.ontrack =
                    null;

                this.peerConnection.onicecandidate =
                    null;

                this.peerConnection.onconnectionstatechange =
                    null;

                this.peerConnection.oniceconnectionstatechange =
                    null;

                this.peerConnection.close();
            } catch (error) {
                console.error(
                    "❌ PEER CLEANUP ERROR:",
                    error
                );
            }

            this.peerConnection =
                null;
        }

        // --------------------------------------------------------
        // RESET
        // --------------------------------------------------------

        this.callId = null;

        this.conversationId =
            null;

        this.remoteUserId =
            null;

        this.callType =
            "audio";

        this.isCallActive =
            false;

        this.isIncomingCall =
            false;

        this.isMuted =
            false;

        this.isCameraOff =
            false;

        this.pendingIceCandidates =
            [];

        this.caller = null;

        // --------------------------------------------------------
        // CLEAR UI STREAMS
        // --------------------------------------------------------

        this.callbacks.onLocalStream?.(
            null
        );

        this.callbacks.onRemoteStream?.(
            null
        );
    }

    // ============================================================
    // RESET STATE
    // ============================================================

    resetCallState() {
        this.callId = null;

        this.conversationId =
            null;

        this.remoteUserId =
            null;

        this.callType =
            "audio";

        this.isCallActive =
            false;

        this.isIncomingCall =
            false;

        this.isMuted =
            false;

        this.isCameraOff =
            false;

        this.pendingIceCandidates =
            [];

        this.caller = null;
    }

    // ============================================================
    // DESTROY
    // ============================================================

    destroy() {
        console.log(
            "🗑️ Destroying CallManager"
        );

        this.cleanup();

        if (
            socket &&
            this.socketListenersRegistered
        ) {
            socket.off(
                "incoming_call"
            );

            socket.off(
                "call_accepted"
            );

            socket.off(
                "call_rejected"
            );

            socket.off(
                "webrtc_offer"
            );

            socket.off(
                "webrtc_answer"
            );

            socket.off(
                "ice_candidate"
            );

            socket.off(
                "call_ended"
            );
        }

        this.socketListenersRegistered =
            false;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const callManager =
    new CallManager();