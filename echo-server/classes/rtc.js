
const webrtc = require("wrtc");
const sdpTransform = require("sdp-transform");

class ServerRTC {
    constructor() {
        this.iceServers = [
            {
                username: 'echo',
                credential: 'echo123',
                urls: ["turn:kury.ddns.net:6984"]
            }
        ]

        // inbound rtc connections (users)
        this.inPeers = new Map();
        // outbound rtc connections (users)
        this.outPeers = new Array();
    }

    async broadcastAudio(data) {
        /**
         * data has
         * sdp (rtc connection description)
         * id (String) user making the connection
        */
        let { sdp, id } = data;
        if (!id) return "NO-ID";
        if (typeof id !== "string") id = String(id);

        const peer = new webrtc.RTCPeerConnection({ iceServers: this.iceServers });
        peer.ontrack = (e) => {
            console.log("peer.ontrack called, populating inPeers")
            this.inPeers.set(id, { peer, audioStream: e.streams[0] });
        };
        const desc = new webrtc.RTCSessionDescription(sdp);
        peer.setRemoteDescription(desc);

        console.log("User " + id + " connected and started broadcasting audio");
        const answer = await peer.createAnswer();
        let parsed = sdpTransform.parse(answer.sdp);
        parsed.media[0].fmtp[0].config = "minptime=10;useinbandfec=1;maxplaybackrate=48000;stereo=1;maxaveragebitrate=510000";
        answer.sdp = sdpTransform.write(parsed);

        await peer.setLocalDescription(answer);

        // if the audioStream and the peer is already populated, immediately return
        if (this.inPeers.has(id)) return peer.localDescription;

        console.log("populating inPeers, but audioStream is null")
        this.inPeers.set(id, { peer, audioStream: null });
        // respond with the payload
        return peer.localDescription;
    }

    subscribeAudio(data) {
        /**
         * data has
         * sdp (rtc connection description)
         * receiverId (String), senderId (String)
         */

        return new Promise((resolve, reject) => {
            let { sdp, senderId, receiverId } = data;
            if (!senderId) return "NO-SENDER-ID";
            if (!receiverId) return "NO-RECEIVER-ID";
            if (typeof senderId !== "string") senderId = String(senderId);
            if (typeof receiverId !== "string") receiverId = String(receiverId);

            //if audioUsers is not in senders
            if (!this.inPeers.has(senderId)) return "NO-SENDER-CONNECTION";

            this.outPeers = this.outPeers.filter((value, key) => {
                if (value.receiver === receiverId) {
                    console.log("User " + value.receiver + " is already connected to user " + senderId + "'s audio stream")
                    value.peer.close();
                    return false;
                }
                return true;
            });

            const peer = new webrtc.RTCPeerConnection({ iceServers: this.iceServers });
            const desc = new webrtc.RTCSessionDescription(sdp);
            peer.setRemoteDescription(desc)
                .then(() => {
                    console.log("User " + receiverId + " connected to user " + senderId + "'s audio stream");
                    const stream = this.inPeers.get(senderId).audioStream;
                    stream.getTracks().forEach(track => peer.addTrack(track, stream));
                    peer.createAnswer()
                        .then((answer) => {
                            let parsed = sdpTransform.parse(answer.sdp);
                            parsed.media[0].fmtp[0].config = "minptime=10;useinbandfec=1;maxplaybackrate=48000;stereo=1;maxaveragebitrate=510000";
                            answer.sdp = sdpTransform.write(parsed);
                            peer.setLocalDescription(answer)
                                .then(() => {
                                    this.outPeers.push({ peer, sender: senderId, receiver: receiverId });
                                    resolve(peer.localDescription);
                                });
                        });
                });
        });
    }

    clearUserConnection(data) {
        /**
         * data has
         * id (String)
         */
        let { id } = data;
        if (!id) return "NO-ID";
        if (typeof id !== "string") id = String(id);

        if (this.inPeers.has(id)) {
            this.inPeers.get(id).peer.close();
            this.inPeers.delete(id);
        }
        
        this.outPeers = this.outPeers.filter((value, key) => {
            if (value.sender === id || value.receiver === id) {
                console.log("Closing all streams connected to user " + id);
                value.peer.close();
                return false;
            }
            return true;
        });
    }

    async stopAudioBroadcast(data) {
        /**
         * data has
         * id (String)
        */
        let { id } = data;
        if (!id) return "NO-ID";
        if (typeof id !== "string") id = String(id);

        if (this.inPeers.has(id)) {
            const { peer, audioStream } = this.inPeers.get(id);
            audioStream.getTracks().forEach(track => track.stop());
            peer.close();
            this.inPeers.delete(id);
        }

        return "OK";
    }
}

module.exports = ServerRTC;