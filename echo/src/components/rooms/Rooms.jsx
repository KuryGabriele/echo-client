import { useState, useEffect } from 'react';

import { ee, storage, ap } from "@root/index";
import StylingComponents from '@root/StylingComponents';

import Room from './Room';

const api = require("@lib/api");
const { error, info } = require("@lib/logger");

function Rooms({ setState, connected, updateCurrentRoom }) {
  const [activeRoomId, setActiveRoomId] = useState(0);
  const [remoteRooms, setRemoteRooms] = useState([
    {
      id: 0,
      name: "none",
      description: "none",
      img: "none"
    }
  ])

  const updateRooms = () => {
    info("[Rooms] Getting rooms list");
    let serverId = storage.get("serverId");
    api.call("rooms/" + serverId)
      .then((result) => {
        if (result.json.length > 0) {
          setRemoteRooms(result.json);
          result.json.forEach((room) => {
            ep.addRoom({ id: room.id, name: room.name, description: room.description, maxUsers: room.maxUsers });

            api.call("rooms/" + room.id + "/" + serverId + "/users")
              .then((res) => {
                if (res.ok && res.json.length > 0) {
                  res.json.forEach((user) => {
                    ep.addUser({ id: user.id, name: user.name, img: user.img, online: user.online, roomId: room.id, status: user.status });
                  });
                }
              })
              .catch((err) => {
                error(err);
              });
          });
        }
      })
      .catch((err) => {
        error(err);
      });
  }

  useEffect(() => {
    updateRooms();

    ee.on("roomClicked", "Rooms.roomClicked", (data) => {
      if (!ep.isAudioFullyConnected()) {
        error("Audio is not fully connected yet. Please wait a few seconds and try again.");
        return;
      }

      const joiningId = data.roomId;
      const currentRoom = ep.getUser(sessionStorage.getItem("id")).currentRoom;
      if (String(joiningId) === currentRoom) return;
      if (currentRoom !== 0) ep.exitFromRoom(sessionStorage.getItem("id"));
      // update audio state of the user
      const userAudioState = ep.getAudioState();
      ep.updateUser({ id: sessionStorage.getItem("id"), field: "muted", value: userAudioState.isMuted });
      ep.updateUser({ id: sessionStorage.getItem("id"), field: "deaf", value: userAudioState.isDeaf });
      // join room
      ep.joinRoom(sessionStorage.getItem("id"), joiningId);
      ep.updateUser({ id: sessionStorage.getItem("id"), field: "currentRoom", value: String(joiningId) });
      // update active room id
      setActiveRoomId(joiningId);
      // send roomid to chatcontent to fetch messages
      updateCurrentRoom(joiningId);
      // add a field to the joining room, saying that i'm joining
      api.call("rooms/join", "POST", {
        userId: sessionStorage.getItem("id"),
        roomId: joiningId, serverId:
          storage.get("serverId"),
        deaf: userAudioState.isDeaf,
        muted: userAudioState.isMuted
      })
        .then((res) => {
          if (res.ok) {
            ap.playJoinSound();
            setState(true);
          }
        })
        .catch((err) => {
          error(err);
        });
    });

    ee.on("needUserCacheUpdate", "Rooms.needUserCacheUpdate", (data) => {
      const id = data.id;
      const func = data.call;

      api.call("users/" + id, "GET")
        .then((res) => {
          if (res.ok) {
            const data = res.json;
            ep.addUser({ id: data.id, name: data.name, img: data.img, online: data.online, roomId: data.roomId });

            if (func) ep[func.function](func.args);
          }
        })
        .catch((err) => {
          error(err);
        });
    });

    return () => {
      ee.releaseGroup("Rooms.roomClicked");
      ee.releaseGroup("Rooms.needUserCacheUpdate");
    }
  }, []);

  useEffect(() => {
    if (!connected) {
      setActiveRoomId(0);
    }
  }, [connected]);


  return (
    <StylingComponents.Rooms.StyledRoomsContainer>
      {
        remoteRooms.map((room) => (
          <Room active={room.id === activeRoomId ? true : false} key={room.id} data={room} />
        ))
      }
    </StylingComponents.Rooms.StyledRoomsContainer>
  )
}

export default Rooms