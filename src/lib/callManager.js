"use client";

import { socket } from "@/lib/socket";

// ============================================================
// WEBRTC CONFIGURATION
// ============================================================

// STUN servers help WebRTC discover the public network path
// between the two users.
//
// This is enough for development/basic testing.
//
// For production reliability, we can later add a TURN server.
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
        // ========================================================
        // WEBRTC
        // ========================================================

        this.peerConnection = null;

        // ========================================================
        // MEDIA STREAMS
        // ========================================================

        this.localStream = null;
        this.remoteStream = null;

        // ========================================================
        // CALL INFORMATION
        // ========================================================

        this.callId = null;
        this.conversationId = null;

        this.currentUserId = null;
        this.remoteUserId = null;

        this.callType = "audio";

        // ========================================================
        // CALL STATE
        // ========================================================

        this.isCallActive = false;
        this.isIncomingCall = false;

        this.isMuted = false;
        this.isCameraOff = false;

        // ========================================================
        // ICE CANDIDATE QUEUE
        // ========================================================

        // Sometimes ICE candidates arrive before the remote
        // description has been applied.
        //
        // We keep them temporarily and add them later.
        this.pendingIceCandidates = [];

        // ========================================================
        // CALLBACKS
        // ========================================================

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

        // ========================================================
        // SOCKET LISTENERS
        // ========================================================

        this.socketListenersRegistered = false;
    }

    // ============================================================
    // INITIALIZE
    // ============================================================

    initialize(userId) {
        this.currentUserId = Number(userId);

        this.registerSocketListeners();

        console.log(
            "📞 CallManager initialized for user:",
            this.currentUserId
        );
    }

    // ============================================================
    // CALLBACK REGISTRATION
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
                "❌ CallManager: Socket is not available"
            );

            return;
        }

        this.socketListenersRegistered = true;

        // ========================================================
        // INCOMING CALL
        // ========================================================

        socket.on(
            "incoming_call",
            (data) => {
                console.log(
                    "📞 Incoming call:",
                    data
                );

                this.handleIncomingCall(data);
            }
        );

        // ========================================================
        // CALL ACCEPTED
        // ========================================================

        socket.on(
            "call_accepted",
            async (data) => {
                console.log(
                    "✅ Call accepted:",
                    data
                );

                await this.handleCallAccepted(
                    data
                );
            }
        );

        // ========================================================
        // CALL REJECTED
        // ========================================================

        socket.on(
            "call_rejected",
            (data) => {
                console.log(
                    "❌ Call rejected:",
                    data
                );

                this.handleCallRejected(
                    data
                );
            }
        );

        // ========================================================
        // WEBRTC OFFER
        // ========================================================

        socket.on(
            "webrtc_offer",
            async (data) => {
                console.log(
                    "📡 WebRTC offer received"
                );

                await this.handleWebRTCOffer(
                    data
                );
            }
        );

        // ========================================================
        // WEBRTC ANSWER
        // ========================================================

        socket.on(
            "webrtc_answer",
            async (data) => {
                console.log(
                    "📡 WebRTC answer received"
                );

                await this.handleWebRTCAnswer(
                    data
                );
            }
        );

        // ========================================================
        // ICE CANDIDATE
        // ========================================================

        socket.on(
            "ice_candidate",
            async (data) => {
                await this.handleIceCandidate(
                    data
                );
            }
        );

        // ========================================================
        // CALL ENDED
        // ========================================================

        socket.on(
            "call_ended",
            (data) => {
                console.log(
                    "📴 Remote ended call:",
                    data
                );

                this.handleRemoteCallEnded(
                    data
                );
            }
        );
    }

    // ============================================================
    // START AUDIO CALL
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
    // START VIDEO CALL
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
            if (
                this.isCallActive ||
                this.callId
            ) {
                throw new Error(
                    "A call is already in progress."
                );
            }

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

            console.log(
                "📞 Starting call:",
                {
                    conversationId:
                        parsedConversationId,

                    receiverId:
                        parsedReceiverId,

                    callType,
                }
            );

            // ====================================================
            // RESET STATE
            // ====================================================

            this.resetCallState();

            this.conversationId =
                parsedConversationId;

            this.remoteUserId =
                parsedReceiverId;

            this.callType =
                callType;

            this.isIncomingCall =
                false;

            // ====================================================
            // GET LOCAL MEDIA
            // ====================================================

            await this.getLocalMedia(
                callType
            );

            // ====================================================
            // TELL SERVER TO START CALL
            // ====================================================

            socket.emit(
                "call_user",
                {
                    conversationId:
                        parsedConversationId,

                    receiverId:
                        parsedReceiverId,

                    callType,
                },
                (response) => {
                    console.log(
                        "📞 call_user response:",
                        response
                    );

                    if (
                        !response?.success
                    ) {
                        this.handleCallError(
                            response?.message ||
                                "Unable to start call."
                        );

                        this.cleanup();
                    }
                }
            );

            if (
                this.callbacks
                    .onCallStarted
            ) {
                this.callbacks
                    .onCallStarted({
                        direction:
                            "outgoing",

                        conversationId:
                            parsedConversationId,

                        receiverId:
                            parsedReceiverId,

                        callType,
                    });
            }

            return {
                success: true,
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
        try {
            if (
                typeof navigator ===
                "undefined" ||
                !navigator.mediaDevices ||
                !navigator.mediaDevices
                    .getUserMedia
            ) {
                throw new Error(
                    "Your browser does not support microphone/camera access."
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

            console.log(
                "🎤 Requesting local media:",
                constraints
            );

            const stream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );

            this.localStream =
                stream;

            // ====================================================
            // LOCAL STREAM CALLBACK
            // ====================================================

            if (
                this.callbacks
                    .onLocalStream
            ) {
                this.callbacks
                    .onLocalStream(
                        stream
                    );
            }

            console.log(
                "✅ Local media acquired"
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
                    "Microphone/camera permission was denied. Please allow access in your browser.";
            } else if (
                error?.name ===
                "NotFoundError"
            ) {
                message =
                    "No microphone or camera was found on this device.";
            } else if (
                error?.name ===
                "NotReadableError"
            ) {
                message =
                    "Your microphone or camera is already being used by another application.";
            } else if (
                error?.name ===
                "SecurityError"
            ) {
                message =
                    "Microphone/camera access is blocked by browser security settings.";
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

        // ========================================================
        // ADD LOCAL TRACKS
        // ========================================================

        if (this.localStream) {
            this.localStream
                .getTracks()
                .forEach((track) => {
                    peerConnection.addTrack(
                        track,
                        this.localStream
                    );
                });
        }

        // ========================================================
        // REMOTE TRACK
        // ========================================================

        peerConnection.ontrack =
            (event) => {
                console.log(
                    "🔊 Remote track received"
                );

                if (
                    event.streams &&
                    event.streams[0]
                ) {
                    this.remoteStream =
                        event.streams[0];
                } else {
                    if (
                        !this.remoteStream
                    ) {
                        this.remoteStream =
                            new MediaStream();
                    }

                    this.remoteStream.addTrack(
                        event.track
                    );
                }

                if (
                    this.callbacks
                        .onRemoteStream
                ) {
                    this.callbacks
                        .onRemoteStream(
                            this.remoteStream
                        );
                }
            };

        // ========================================================
        // ICE CANDIDATE
        // ========================================================

        peerConnection.onicecandidate =
            (event) => {
                if (
                    !event.candidate
                ) {
                    return;
                }

                if (
                    !this.remoteUserId ||
                    !this.callId
                ) {
                    return;
                }

                console.log(
                    "🧊 Sending ICE candidate"
                );

                socket.emit(
                    "ice_candidate",
                    {
                        callId:
                            this.callId,

                        receiverId:
                            this.remoteUserId,

                        conversationId:
                            this.conversationId,

                        candidate:
                            event.candidate,
                    }
                );
            };

        // ========================================================
        // CONNECTION STATE
        // ========================================================

        peerConnection.onconnectionstatechange =
            () => {
                const state =
                    peerConnection.connectionState;

                console.log(
                    "🔗 WebRTC connection state:",
                    state
                );

                if (
                    state ===
                    "connected"
                ) {
                    this.isCallActive =
                        true;

                    if (
                        this.callbacks
                            .onCallConnected
                    ) {
                        this.callbacks
                            .onCallConnected({
                                callId:
                                    this.callId,

                                callType:
                                    this.callType,
                            });
                    }
                }

                if (
                    state ===
                        "failed" ||
                    state ===
                        "disconnected" ||
                    state ===
                        "closed"
                ) {
                    console.log(
                        "⚠️ WebRTC connection ended:",
                        state
                    );
                }
            };

        // ========================================================
        // ICE CONNECTION STATE
        // ========================================================

        peerConnection.oniceconnectionstatechange =
            () => {
                console.log(
                    "🧊 ICE connection state:",
                    peerConnection
                        .iceConnectionState
                );
            };

        return peerConnection;
    }

    // ============================================================
    // HANDLE INCOMING CALL
    // ============================================================
// ============================================================
// HANDLE INCOMING CALL
// ============================================================

handleIncomingCall(data) {
    if (!data?.callId) {
        console.error(
            "❌ Incoming call rejected: missing callId",
            data
        );

        return;
    }

    const incomingCallId = data.callId;

    const incomingConversationId =
        Number(data.conversationId);

    const incomingCallerId =
        Number(data.callerId);

    // ========================================================
    // IMPORTANT
    // ========================================================
    // Do NOT consider callId alone as proof that we are
    // currently in an active call.
    //
    // A stale callId can remain temporarily during cleanup.
    //
    // A call is considered busy only when:
    //
    // 1. We actually have a local stream
    // 2. OR we have a peer connection
    // 3. OR the call is actually marked active
    //
    // This prevents false "busy" rejections.
    // ========================================================

    const actuallyInCall =
        this.isCallActive ||
        Boolean(this.peerConnection) ||
        Boolean(this.localStream);

    if (actuallyInCall) {
        console.log(
            "⚠️ Already in an active call. Rejecting incoming call:",
            incomingCallId
        );

        socket.emit(
            "call_reject",
            {
                callId: incomingCallId,
                reason: "busy",
            },
            (response) => {
                console.log(
                    "📞 Busy rejection response:",
                    response
                );
            }
        );

        return;
    }

    // ========================================================
    // CLEAR ANY STALE CALL STATE
    // ========================================================

    this.callId = null;
    this.conversationId = null;
    this.remoteUserId = null;

    this.callType = "audio";

    this.isIncomingCall = false;
    this.isCallActive = false;

    this.pendingIceCandidates = [];

    // ========================================================
    // STORE INCOMING CALL
    // ========================================================

    this.callId = incomingCallId;

    this.conversationId =
        incomingConversationId;

    this.currentUserId =
        Number(this.currentUserId);

    this.remoteUserId =
        incomingCallerId;

    this.callType =
        data.callType === "video" ||
        data.type === "video"
            ? "video"
            : "audio";

    this.isIncomingCall = true;

    console.log(
        "📞 Incoming call stored:",
        {
            callId: this.callId,
            conversationId:
                this.conversationId,
            callerId:
                this.remoteUserId,
            callType:
                this.callType,
        }
    );

    // ========================================================
    // NOTIFY UI
    // ========================================================

    if (
        typeof this.callbacks
            .onIncomingCall ===
        "function"
    ) {
        this.callbacks.onIncomingCall({
            ...data,

            callId:
                this.callId,

            conversationId:
                this.conversationId,

            callerId:
                this.remoteUserId,

            callType:
                this.callType,
        });
    }
}

    // ============================================================
    // ACCEPT INCOMING CALL
    // ============================================================

    async acceptCall() {
        try {
            if (
                !this.callId ||
                !this.remoteUserId ||
                !this.conversationId
            ) {
                throw new Error(
                    "No incoming call is available."
                );
            }

            console.log(
                "✅ Accepting incoming call"
            );

            // ====================================================
            // GET LOCAL MEDIA
            // ====================================================

            await this.getLocalMedia(
                this.callType
            );

            // ====================================================
            // CREATE PEER CONNECTION
            // ====================================================

            this.createPeerConnection();

            // ====================================================
            // ACCEPT CALL THROUGH SOCKET
            // ====================================================

            socket.emit(
                "call_accepted",
                {
                    callId:
                        this.callId,

                    callerId:
                        this.remoteUserId,

                    conversationId:
                        this.conversationId,
                },
                (response) => {
                    console.log(
                        "✅ call_accepted response:",
                        response
                    );

                    if (
                        !response?.success
                    ) {
                        this.handleCallError(
                            response?.message ||
                                "Unable to accept call."
                        );

                        this.cleanup();
                    }
                }
            );

            this.isIncomingCall =
                false;

            if (
                this.callbacks
                    .onCallAccepted
            ) {
                this.callbacks
                    .onCallAccepted({
                        callId:
                            this.callId,

                        callType:
                            this.callType,
                    });
            }

            return {
                success: true,
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

            this.cleanup();

            return {
                success: false,

                message:
                    error?.message ||
                    "Unable to accept call.",
            };
        }
    }

    // ============================================================
    // REJECT INCOMING CALL
    // ============================================================

// ============================================================
// REJECT INCOMING CALL
// ============================================================

rejectCall(reason = "rejected") {
    if (!this.callId) {
        console.log(
            "⚠️ No incoming call to reject"
        );

        return;
    }

    const rejectedCallId =
        this.callId;

    const rejectedConversationId =
        this.conversationId;

    const rejectedRemoteUserId =
        this.remoteUserId;

    console.log(
        "❌ Rejecting call:",
        {
            callId:
                rejectedCallId,
            reason,
        }
    );

    socket.emit(
        "call_reject",
        {
            callId:
                rejectedCallId,

            reason,
        },
        (response) => {
            console.log(
                "❌ call_reject response:",
                response
            );
        }
    );

    if (
        typeof this.callbacks
            .onCallRejected ===
        "function"
    ) {
        this.callbacks.onCallRejected({
            callId:
                rejectedCallId,

            conversationId:
                rejectedConversationId,

            callerId:
                rejectedRemoteUserId,

            reason,
        });
    }

    this.cleanup();
}

    // ============================================================
    // HANDLE CALL ACCEPTED
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

            // ====================================================
            // ONLY HANDLE OUR CURRENT CALL
            // ====================================================

            if (
                this.callId &&
                this.callId !==
                    data.callId
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

            // ====================================================
            // CREATE PEER CONNECTION
            // ====================================================

            const peerConnection =
                this.createPeerConnection();

            // ====================================================
            // CREATE OFFER
            // ====================================================

            console.log(
                "📡 Creating WebRTC offer"
            );

            const offer =
                await peerConnection.createOffer();

            await peerConnection.setLocalDescription(
                offer
            );

            // ====================================================
            // SEND OFFER
            // ====================================================

            socket.emit(
                "webrtc_offer",
                {
                    callId:
                        this.callId,

                    receiverId:
                        this.remoteUserId,

                    conversationId:
                        this.conversationId,

                    offer,
                },
                (response) => {
                    if (
                        !response?.success
                    ) {
                        this.handleCallError(
                            response?.message ||
                                "Failed to send WebRTC offer."
                        );
                    }
                }
            );
        } catch (error) {
            console.error(
                "❌ HANDLE CALL ACCEPTED ERROR:",
                error
            );

            this.handleCallError(
                error?.message ||
                    "Failed to establish call."
            );
        }
    }

    // ============================================================
    // HANDLE WEBRTC OFFER
    // ============================================================

    async handleWebRTCOffer(
        data
    ) {
        try {
            if (
                !data?.offer
            ) {
                return;
            }

            // ====================================================
            // ONLY HANDLE CURRENT CALL
            // ====================================================

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
                    data.senderId
                );

            // ====================================================
            // CREATE PEER CONNECTION
            // ====================================================

            const peerConnection =
                this.createPeerConnection();

            // ====================================================
            // SET REMOTE DESCRIPTION
            // ====================================================

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.offer
                )
            );

            // ====================================================
            // ADD QUEUED ICE CANDIDATES
            // ====================================================

            await this.flushPendingIceCandidates();

            // ====================================================
            // CREATE ANSWER
            // ====================================================

            const answer =
                await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
                answer
            );

            // ====================================================
            // SEND ANSWER
            // ====================================================

            socket.emit(
                "webrtc_answer",
                {
                    callId:
                        this.callId,

                    receiverId:
                        this.remoteUserId,

                    conversationId:
                        this.conversationId,

                    answer,
                },
                (response) => {
                    if (
                        !response?.success
                    ) {
                        this.handleCallError(
                            response?.message ||
                                "Failed to send WebRTC answer."
                        );
                    }
                }
            );
        } catch (error) {
            console.error(
                "❌ HANDLE WEBRTC OFFER ERROR:",
                error
            );

            this.handleCallError(
                "Failed to process WebRTC offer."
            );
        }
    }

    // ============================================================
    // HANDLE WEBRTC ANSWER
    // ============================================================

    async handleWebRTCAnswer(
        data
    ) {
        try {
            if (
                !data?.answer
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
                    "❌ Cannot process answer without peer connection"
                );

                return;
            }

            console.log(
                "📡 Setting remote WebRTC answer"
            );

            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.answer
                )
            );

            await this.flushPendingIceCandidates();
        } catch (error) {
            console.error(
                "❌ HANDLE WEBRTC ANSWER ERROR:",
                error
            );

            this.handleCallError(
                "Failed to process WebRTC answer."
            );
        }
    }

    // ============================================================
    // HANDLE ICE CANDIDATE
    // ============================================================

    async handleIceCandidate(
        data
    ) {
        try {
            if (
                !data?.candidate
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

            // ====================================================
            // IF REMOTE DESCRIPTION IS NOT READY
            // ====================================================

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

            // ====================================================
            // ADD CANDIDATE
            // ====================================================

            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(
                    data.candidate
                )
            );
        } catch (error) {
            console.error(
                "❌ HANDLE ICE CANDIDATE ERROR:",
                error
            );
        }
    }

    // ============================================================
    // FLUSH ICE CANDIDATES
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
            this.pendingIceCandidates
                .length === 0
        ) {
            return;
        }

        const candidates = [
            ...this.pendingIceCandidates,
        ];

        this.pendingIceCandidates = [];

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
                    "❌ FAILED TO ADD QUEUED ICE CANDIDATE:",
                    error
                );
            }
        }
    }

    // ============================================================
    // END CALL
    // ============================================================

    endCall(
        reason = "ended"
    ) {
        if (
            !this.callId
        ) {
            this.cleanup();

            return;
        }

        console.log(
            "📴 Ending call:",
            reason
        );

        socket.emit(
            "call_ended",
            {
                callId:
                    this.callId,

                receiverId:
                    this.remoteUserId,

                conversationId:
                    this.conversationId,

                reason,
            },
            (response) => {
                console.log(
                    "📴 call_ended response:",
                    response
                );
            }
        );

        this.cleanup();
    }

    // ============================================================
    // HANDLE REMOTE CALL ENDED
    // ============================================================

    handleRemoteCallEnded(
        data
    ) {
        if (
            this.callId &&
            data?.callId &&
            data.callId !==
                this.callId
        ) {
            return;
        }

        console.log(
            "📴 Remote call ended:",
            data?.reason
        );

        if (
            this.callbacks
                .onCallEnded
        ) {
            this.callbacks
                .onCallEnded(
                    data
                );
        }

        this.cleanup();
    }

    // ============================================================
    // HANDLE CALL REJECTED
    // ============================================================

  // ============================================================
// HANDLE CALL REJECTED
// ============================================================

handleCallRejected(data) {
    if (!data?.callId) {
        return;
    }

    // ========================================================
    // IGNORE REJECTION FOR ANOTHER CALL
    // ========================================================

    if (
        this.callId &&
        data.callId !== this.callId
    ) {
        console.log(
            "⚠️ Ignoring rejection for another call:",
            {
                currentCallId:
                    this.callId,

                rejectedCallId:
                    data.callId,
            }
        );

        return;
    }

    console.log(
        "❌ Call rejected:",
        data
    );

    if (
        typeof this.callbacks
            .onCallRejected ===
        "function"
    ) {
        this.callbacks.onCallRejected(
            data
        );
    }

    this.cleanup();
}

    // ============================================================
    // MUTE / UNMUTE MICROPHONE
    // ============================================================

    toggleMute() {
        if (
            !this.localStream
        ) {
            return false;
        }

        const audioTracks =
            this.localStream.getAudioTracks();

        if (
            audioTracks.length ===
            0
        ) {
            return false;
        }

        this.isMuted =
            !this.isMuted;

        audioTracks.forEach(
            (track) => {
                track.enabled =
                    !this.isMuted;
            }
        );

        console.log(
            this.isMuted
                ? "🔇 Microphone muted"
                : "🎤 Microphone unmuted"
        );

        if (
            this.callbacks
                .onMuteChanged
        ) {
            this.callbacks
                .onMuteChanged(
                    this.isMuted
                );
        }

        return this.isMuted;
    }

    // ============================================================
    // CAMERA ON / OFF
    // ============================================================

    toggleCamera() {
        if (
            !this.localStream
        ) {
            return false;
        }

        const videoTracks =
            this.localStream.getVideoTracks();

        if (
            videoTracks.length ===
            0
        ) {
            return false;
        }

        this.isCameraOff =
            !this.isCameraOff;

        videoTracks.forEach(
            (track) => {
                track.enabled =
                    !this.isCameraOff;
            }
        );

        console.log(
            this.isCameraOff
                ? "📹 Camera turned off"
                : "📹 Camera turned on"
        );

        if (
            this.callbacks
                .onCameraChanged
        ) {
            this.callbacks
                .onCameraChanged(
                    this.isCameraOff
                );
        }

        return this.isCameraOff;
    }

    // ============================================================
    // HANDLE CALL ERROR
    // ============================================================

    handleCallError(
        message
    ) {
        console.error(
            "❌ CALL ERROR:",
            message
        );

        if (
            this.callbacks
                .onCallError
        ) {
            this.callbacks
                .onCallError(
                    message
                );
        }
    }

    // ============================================================
    // CLEANUP
    // ============================================================

    cleanup() {
        console.log(
            "🧹 Cleaning up call resources"
        );

        // ========================================================
        // STOP LOCAL MEDIA
        // ========================================================

        if (
            this.localStream
        ) {
            this.localStream
                .getTracks()
                .forEach(
                    (track) => {
                        track.stop();
                    }
                );

            this.localStream =
                null;
        }

        // ========================================================
        // STOP REMOTE MEDIA
        // ========================================================

        if (
            this.remoteStream
        ) {
            this.remoteStream
                .getTracks()
                .forEach(
                    (track) => {
                        track.stop();
                    }
                );

            this.remoteStream =
                null;
        }

        // ========================================================
        // CLOSE PEER CONNECTION
        // ========================================================

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

        // ========================================================
        // RESET STATE
        // ========================================================

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
    }

    // ============================================================
    // RESET CALL STATE
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
}

// ============================================================
// SINGLETON
// ============================================================

export const callManager =
    new CallManager();