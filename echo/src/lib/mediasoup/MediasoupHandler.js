import { ee } from "@root/index";
import MicrophoneCapturer from "@lib/mediasoup/MicrophoneCapturer";

const api = require('@lib/api');
const mediasoup = require('mediasoup-client');
const { warn, error, log } = require('@lib/logger');

class MediasoupHandler {
    constructor(inputDeviceId = 'default', outputDeviceId = 'default',) {
        this.mic = new MicrophoneCapturer(inputDeviceId);

        this.mediasoupDevice = new mediasoup.Device();
        this.transports = new Map();
        this.audioProducer = null;
    }

    /**
 * Creates a new receive transport for mediasoup based on the given data.
 * @async
 * @param {string} type - The type of transport to create.
 * @param {Object} data - The data required to create the receive transport.
 * @param {string} data.id - The ID of the receive transport.
 * @param {RTCIceParameters} data.iceParameters - The ICE parameters for the transport.
 * @param {RTCIceCandidate[]} data.iceCandidates - The ICE candidates for the transport.
 * @param {RTCDtlsParameters} data.dtlsParameters - The DTLS parameters for the transport.
 * @param {RTCSctpParameters} data.sctpParameters - The SCTP parameters for the transport.
 * @param {RTCIceServer[]} data.iceServers - The ICE servers for the transport.
 * @param {string} data.iceTransportPolicy - The ICE transport policy for the transport.
 * @param {Object} data.additionalSettings - Additional settings for the transport.
 */
    async createTransport(type, routerCapabilities, tranportData) {
        return new Promise(async (resolve, reject) => {
            if (!this.mediasoupDevice) {
                reject('mediasoupDevice not initialized');
            }

            if (!type) {
                reject('Type is required');
            }

            if (!routerCapabilities) {
                reject('Router capabilities are required');
            }

            if (!tranportData) {
                reject('Transport data is required');
            }

            if (!this.mediasoupDevice.loaded) {
                // Load the device with the given rtpCapabilities
                await this.mediasoupDevice.load({ routerRtpCapabilities: routerCapabilities });
            }

            let transport;
            if (type === 'audioOut' || type === 'videoOut') {
                transport = await this.mediasoupDevice.createSendTransport(tranportData);
                transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
                    // TODO Send the producer data to the server
                });
            } else if (type === 'audioIn' || type === 'videoIn') {
                transport = await this.mediasoupDevice.createRecvTransport(tranportData);
            } else {
                reject('Invalid transport type');
            }

            if (type === 'audioOut') {
                // use audio out transport to check connection state
                transport.on('connectionstatechange', (state) => {
                    ee.rtcConnectionStateChange({
                        state: state,
                    })
                });
            }

            transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                api.call(
                    "media/transport/connect",
                    "POST",
                    {
                        type: type,
                        data: dtlsParameters
                    }
                )
            });

            this.transports.set(type, transport);
            resolve(transport);
        });
    }

    closeConnection() {
        this.transports.forEach((transport) => {
            transport.close();
        });

        this.transports.clear();
    }

    getRtpCapabilities() {
        if (this.mediasoupDevice) {
            return this.mediasoupDevice.rtpCapabilities;
        }

        return null;
    }

    /**
     * Checks if the send transport is fully connected.
     * @returns {boolean} Whether the send transport is fully connected or not.
    */
    isFullyConnected() {
        const audioTransport = this.transports.get('audioOut');
        if (audioTransport) {
            return (
                audioTransport.connectionState === "connected"
            )
        } else {
            return true;
        }
    }

    startAudioBroadcast() {
        return new Promise(async (resolve, reject) => {
            try {
                this.mic.start(this.inputDeviceId).then(async (track) => {
                    const audioTransport = this.transports.get('audioOut');
                    const audioProducer = await audioTransport.produce({
                        track: track,
                        codecOptions: {
                            opusStereo: true,
                            opusDtx: true
                        }
                    });

                    this.audioProducer = audioProducer;
                    resolve(audioProducer);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    stopAudioBroadcast() {
        return new Promise(async (resolve, reject) => {
            try {
                this.mic.stop();
                if (this.audioProducer) {
                    this.audioProducer.close();
                    this.audioProducer = null;
                }

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    setMicrophoneVolume(volume) {
        this.mic.setVolume(volume);
    }

    setMicrophoneDevice(deviceId) {
        return new Promise(async (resolve, reject) => {
            try {
                //instantiate new microphone capturer with new device id
                let newMic = new MicrophoneCapturer(deviceId);
                
                if(this.audioProducer) {
                    //replace the outgoin stream with the new one
                    this.audioProducer.replaceTrack(newMic.stream.getAudioTracks()[0]);
                }
    
                this.mic = newMic;
    
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    toggleMute(mute) {
        if (mute) {
            this.mic.mute();
        } else {
            this.mic.unmute();
        }

        //TODO send audio state to server
    } 

    setVadTreshold(treshold) {
        this.mic.setTalkingThreshold(treshold);
    }

    setEchoCancellation(enabled) {
        this.mic.setEchoCancellation(enabled);
    }

    setNoiseSuppression(enabled) {
        this.mic.setNoiseSuppression(enabled);
    }

    setAutoGainControl(enabled) {
        this.mic.setAutoGainControl(enabled);
    }


    setSpeakerVolume(volume) {

    }

    setSpeakerDevice(deviceId) {

    }

    toggleDeaf(deaf) {
        if(deaf) {

        } else {

        } 
        
        //TODO send audio state to server
    }
}

export default MediasoupHandler;