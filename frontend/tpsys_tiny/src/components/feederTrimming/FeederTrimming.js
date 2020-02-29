import React, { useEffect, useState } from "react";
import { useQuery } from "react-apollo-hooks";
import { QUERY_TRIM_FEEDER_IMG_OFFSET } from "../../utils/graphql";
import { useDrop } from "react-dnd";
import Box from "./Box";
import BackgroundVideo from "./BackgroundVideo";
import MoveBackground from "./MoveBackground";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import VideoGraphQl from "./VideoGraphQl";

var setToLeft = 0;
const machineId = 0;

/**
 * The prototype of Feeder Trimming based on moving with the annotation. This component also encapsulates other prototypes of trimming.
 */
const FeederTrimming = () => {
  const [boxTop, setBoxTop] = useState(230);
  const [boxLeft, setBoxLeft] = useState(230);
  const [leftOffset, setLeftOffset] = useState(0);
  const [img, setImg] = useState("");
  const [offset, setOffset] = useState({
    top: 0,
    left: 0
  });

  const { data, error, loading } = useQuery(QUERY_TRIM_FEEDER_IMG_OFFSET, {
    variables: { machineId: machineId, x: offset.left, y: offset.top }
  });

  useEffect(() => {
    if (data && data.getFeederImageOffset) {
      setImg(data.getFeederImageOffset.feederImgBase64);
      setOffset({
        top: data.getFeederImageOffset.y,
        left: data.getFeederImageOffset.x
      });
      setLeftOffset(0);
      setBoxLeft(230);
    }
    document
      .getElementById("myBackground")
      .addEventListener("transitionend", fetchImg);
    return () =>
      document
        .getElementById("myBackground")
        .removeEventListener("transitionend", fetchImg);
  }, [data, error, loading]);

  const fetchImg = () => {
    setOffset({ top: offset.top, left: offset.left + setToLeft });
  };

  const [, drop] = useDrop({
    accept: "box",
    drop(item, monitor) {
      const delta = monitor.getDifferenceFromInitialOffset();
      setBoxTop(boxTop + delta.y);
      setBoxLeft(boxLeft + delta.x);
      setLeftOffset(delta.x);
      setToLeft = delta.x;
      return undefined;
    },
    collect: monitor => ({
      dropInitialClientOffset: monitor.getInitialClientOffset(),
      dropClientOffset: monitor.getClientOffset()
    })
  });

  const stylesTrans = {
    marginLeft: 0,
    backgroundImage: `url(${img})`,
    width: 500,
    height: 500,
    backgroundRepeat: "no-repeat",
    position: "relative",
    left: -leftOffset,
    transition: "left 0.2s ease-in"
  };

  const styles = {
    marginLeft: 0,
    backgroundImage: `url(${img})`,
    width: 500,
    height: 500,
    backgroundRepeat: "no-repeat",
    position: "relative",
    left: -leftOffset
  };

  const boxStyles = {
    width: 500,
    height: 500,
    position: "relative"
  };

  const videoMovingStyles = {
    position: "relative",
    top: 20,
    marginBottom: 10,
    backgroundRepeat: "no-repeat",
    left: -leftOffset
  };

  return (
    <div>
      <Paper style={{ marginTop: 80, paddingBottom: 50, width: "90%" }}>
        <Typography variant="h5" style={{ padding: 10, paddingBottom: 0 }}>
          #1 Annotation movement
        </Typography>
        <Typography variant="subtitle1">
          <ul>
            <li>
              Drag the annotation and drop it somewhere. On the drop, the image
              is transitioned and updated to simulate the camera's X-axis
              movement.
            </li>
          </ul>
        </Typography>
        <div id="myBackground" style={leftOffset != 0 ? stylesTrans : styles}>
          <div>
            <div ref={drop} style={boxStyles}>
              <Box
                style={{ marginTop: 130 }}
                key={1}
                id={1}
                left={boxLeft}
                top={boxTop}
              ></Box>
            </div>
          </div>
        </div>
      </Paper>
      <div
        style={{
          marginTop: 30,
          marginBottom: 30,
          position: "absolute",
          top: 640
        }}
      ></div>

      <Paper style={{ marginTop: 40, paddingBottom: 50, width: "90%" }}>
        <Typography variant="h5" style={{ padding: 10, paddingBottom: 0 }}>
          #2 Background movement & Click
        </Typography>
        <Typography variant="subtitle1">
          <ul>
            <li>
              Move with the background to get the annotation to the desired
              position. On release, the image is updated.
            </li>
            <li>
              Click to move the annotation's top left corner to cursor's
              position.
            </li>
          </ul>
        </Typography>
        <MoveBackground />
      </Paper>
      {/* <Paper style={{ marginTop: 40, paddingBottom: 50, width: "90%" }}>
        <Typography variant="h5" style={{ padding: 10, paddingBottom: 0 }}>
          #3 Video stream
          <br />
          <strong>
            This is only available with source video files which have over 9 GB,
            it's not checked in P4.
          </strong>
        </Typography>
        <Typography variant="subtitle1">
          <ul>
            <li>
              Based on playing videos. On each movement request, the new video
              is fetched and played.
            </li>
            <li>
              Click on the very edge of the image = longer camera movement{" "}
            </li>
            <li>Click near the edge of the image = shorter camera movement </li>
            <li>
              Click outside these zones = camera and annotation moves to the
              cursor position{" "}
            </li>
          </ul>
        </Typography>
        <div id="videoMoving" style={videoMovingStyles}>
          <BackgroundVideo />
        </div>
      </Paper> */}
      <Paper style={{ marginTop: 40, paddingBottom: 50, width: "90%" }}>
        <Typography variant="h5" style={{ padding: 10, paddingBottom: 0 }}>
          #3 Stream of images
        </Typography>
        <Typography variant="subtitle1">
          <ul>
            <li>
              Multiple images per second are sent from the tpsys simulator
            </li>
            <li>
              Machine Agent is subscribed to this stream using grpc -> Client
              app is subscribed to this stream using Machine Agent's GraphQL API
            </li>
            <li>
              Move with the background to get the annotation to the desired
              position.
            </li>
            <li>Click to move the annotation to cursor's position.</li>
          </ul>
        </Typography>
        <VideoGraphQl />
      </Paper>
    </div>
  );
};

export default FeederTrimming;
