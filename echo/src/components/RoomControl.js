import '../index.css';
import { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Zoom from '@mui/material/Zoom';
import Tooltip from "@mui/material/Tooltip";
import { ButtonGroup } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@emotion/react';
import { useNavigate } from 'react-router-dom';

import KeyboardVoiceRoundedIcon from '@mui/icons-material/KeyboardVoiceRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import HeadsetMicRoundedIcon from '@mui/icons-material/HeadsetMicRounded';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import HeadsetOffRoundedIcon from '@mui/icons-material/HeadsetOffRounded';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';

import muteSound from "../audio/mute.mp3";
import unmuteSound from "../audio/unmute.mp3";
import deafSound from "../audio/deaf.mp3";
import undeafSound from "../audio/undeaf.mp3";

const api = require('../api')
const at = require('../audioTransmitter')
const ar = require('../audioReceiver')
const ep = require('../echoProtocol')

const theme = createTheme({
  palette: {
    primary: { main: '#f5e8da', },
    secondary: { main: '#ce8ca5', },
  },
  components: {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: "white",
          fontSize: ".9rem",
          border: "1px solid rgb(235, 144, 235)",
          background: "#3e2542",
          borderRadius: 10,
          padding: 8
        },
        arrow: {
          fontSize: 16,
          width: 17,
          "&::before": {
            border: "1px solid rgb(235, 144, 235)",
            backgroundColor: "#3e2542",
            boxSizing: "border-box"
          }
        }
      }
    }
  }
});

function RoomControl({ screenSharing }) {
  const [muted, setMuted] = useState(false);
  const [deaf, setDeaf] = useState(false);
  const [wasMuted, setWasMuted] = useState(false);
  const [connectionState, setConnState] = useState("Not connected");
  const [ping, setPing] = useState(0);

  let navigate = useNavigate();

  useEffect(() => { at.toggleMute(muted) }, [muted]);
  useEffect(() => { ep.deafUser(localStorage.getItem("userId"), deaf) }, [deaf]);

  const muteAudio = new Audio(muteSound);
  muteAudio.volume = 0.6;
  const unmuteAudio = new Audio(unmuteSound);
  unmuteAudio.volume = 0.6;
  const deafAudio = new Audio(deafSound);
  deafAudio.volume = 0.6;
  const undeafAudio = new Audio(undeafSound);
  undeafAudio.volume = 0.6;

  var interval = null;
  const updatePing = () => {
    interval = setInterval(() => {
      setPing(ep.getPing());
    }, 1000);
  }

  const stopUpdatePing = () => {
    clearInterval(interval);
    interval = null;
    console.log("removed interval")
  }

  const exitRoom = () => {
    //Notify api
    var nickname = localStorage.getItem("userNick");
    api.call('setOnline/' + nickname + '/F')
      .then(res => {
        // at.startInputAudioStream();
        ar.stopOutputAudioStream();
        at.stopAudioStream();
        if (!res.ok) console.error("Could not set user as offline");
        setConnState("Not connected")
        navigate("/");
      });
  }

  const computeAudio = (isDeaf) => {
    if (isDeaf)
      if (!muted) {
        muteAudio.play();
      } else {
        unmuteAudio.play();
      }
    else
      if (!deaf) {
        deafAudio.play();
      } else {
        undeafAudio.play();
      }
  }

  const undeafOnMute = () => { setDeaf(false); }
  const muteOnDeaf = () => { setMuted(true); computeAudio(false); }
  const unmuteOnDeaf = () => { setMuted(false); computeAudio(false); }
  const muteAndDeaf = () => { setMuted(true); setDeaf(true); computeAudio(false); }

  const muteMic = () => {
    if (muted) undeafOnMute();
    setMuted(!muted);
    if (!deaf) setWasMuted(true);
    if (wasMuted) setWasMuted(false);
    if (muted && deaf) computeAudio(false)
    if (muted && !deaf) { computeAudio(true); }
    if (!muted && !deaf) computeAudio(true)
  }

  const deafHeadphones = () => {
    if (!muted) muteOnDeaf()
    else if (muted && !deaf) muteAndDeaf()
    else unmuteOnDeaf();
    if (wasMuted && deaf) { setMuted(true); }
    setDeaf(!deaf);
  }

  return (
    <div className='roomControl'>
      <ThemeProvider theme={theme}>
        <Tooltip title={ping + " ms"} onMouseEnter={updatePing} onMouseLeave={stopUpdatePing} placement="top" arrow TransitionComponent={Zoom} followCursor>
          <div className="voiceConnected"><p>{connectionState}</p> <p><SignalCellularAltIcon /></p></div>
        </Tooltip>
        <ButtonGroup variant='text' className='buttonGroup'>
          <Tooltip title={!muted ? "Mute" : "Unmute"} placement="top" arrow enterDelay={1} enterTouchDelay={20}>
            <Button disableRipple onClick={muteMic}>
              {!muted ? <KeyboardVoiceRoundedIcon /> : <MicOffRoundedIcon />}
            </Button>
          </Tooltip>
          <Tooltip title={!deaf ? "Deafen" : "Undeafen"} placement="top" arrow enterDelay={1} enterTouchDelay={20}>
            <Button disableRipple onClick={deafHeadphones}>
              {!deaf ? <HeadsetMicRoundedIcon /> : <HeadsetOffRoundedIcon />}
            </Button>
          </Tooltip>
          <Button>
            {!screenSharing ? <ScreenShareIcon /> : <StopScreenShareIcon />}
          </Button>
          <Button>
            <SettingsIcon />
          </Button>
          <Button onClick={exitRoom}>
            <LogoutIcon />
          </Button>
        </ButtonGroup>
      </ThemeProvider>
    </div>
  )
}

RoomControl.defaultProps = {
  muted: false,
  deaf: false
}

export default RoomControl