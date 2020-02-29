import React, { useEffect, useState, useRef } from "react";
import { useQuery, useSubscription } from "react-apollo-hooks";
import { QUERY_TRIM_FEEDER_IMG_OFFSET, GET_TEST_QUERY, EVENT_HAPPENED, QUERY_MOVE_CAM_X, QUERY_CONTROL_CAMERA, CAMERA_IMAGE_RECEIVED } from "../../utils/graphql";
import { Stage, Layer, Image } from "react-konva";
import useImage from "use-image";
import annotation from "./static/ann_lg.png";
import annotation_small from "./static/ann_src_small.png";
import _ from "lodash";
import { Button } from "@material-ui/core";
import blackBcg from "./static/blackBcg.jpg";

var setToLeft = 0;
var setToTop = 0;

const machineId = 0;
const initialAnnX = -25;
const initialAnnXSmall = 25;
const initialAnnY = 0;
const annotationWidth = 440;
const annotationHeight = 300;

const annotationWidthSmall = 310;
const annotationHeightSmall = 210;

//var anPos = 250;
var lastDelta = 0;
var movementOffset = 0;
var lastDeltaX = 0;
var dragYBcgMove = 0;
var dragXBcgMove = 0;
var bcgImgPos = -800;
/**
 * The prototype of Feeder Trimming based on GraphQl subscription
 */
const ImageStitching = () => {

  const [mouseDownY, setMouseDownY] = useState(0);
  const [mouseDownX, setMouseDownX] = useState(0);
  const [goUp, setGoUp] = useState(true);
  const [goRight, setGoRight] = useState(true);
  const [bcgPosition, setBcgPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({
    top: 0,
    left: 800
  });
  const [currentZoomOut, setcurrentZoomOut] = useState(1);

  const stageRef = useRef(null);
  const [img, setImg] = useState("");
  const [bcgImage] = useImage(img);
  const [anPos, setAnPos] = useState(75);
  const prevdragYBcgMove = usePrevious(dragYBcgMove);
  const prevdragXBcgMove = usePrevious(dragXBcgMove);
  const [annotationImage] = useImage(annotation);
  const [annotationImageSmall] = useImage(annotation_small);
  const [blackBcgImage] = useImage(blackBcg);

  useQuery(
    QUERY_CONTROL_CAMERA,
    {
      variables: { x: offset.left, zoomOut: currentZoomOut }
    }
  );

  const setLastDelta = (val) => {
    lastDelta = val;
  }

  const setDragYBcgMove = (val) => {
    dragYBcgMove = val;
  }

  const setDragXBcgMove = (val) => {
    dragXBcgMove = val;
  }

  const setMovementOffset = (val) => {
    movementOffset = val;
  }

  const setLastDeltaX = (val) => {
    lastDeltaX = val;
  }

  const cameraImageReceived = useSubscription(CAMERA_IMAGE_RECEIVED);

  useEffect(() => {
    if(cameraImageReceived.loading) console.log(`subscription loading`);
    else if(cameraImageReceived.error) console.log(`subscription error`);
    else {
      setImg(cameraImageReceived.data.newCameraImage.imgSerialized);
      setBcgPosition({ x: 0, y: 0 });
    }
  }, [cameraImageReceived.data, cameraImageReceived.error, cameraImageReceived.loading]);

  const handleMouseDown = e => {
    var stage = e.currentTarget;
    setMouseDownY(stage.getPointerPosition().y);
    setLastDelta(0);
    setMouseDownX(stage.getPointerPosition().x);
    setLastDeltaX(0);
  };

  const handleOnClick = e => {
    const aw = currentZoomOut == 0 ? annotationWidth : annotationWidthSmall;
    const ah = currentZoomOut == 0 ? annotationHeight : annotationHeightSmall;

    const iax = currentZoomOut == 0 ? initialAnnX : initialAnnXSmall;

    const p1 = iax - e.currentTarget.getPointerPosition().x + (aw / 2);
    setAnnPosition(e.currentTarget.getPointerPosition().y - (ah / 2));
    setToLeft = -p1;
    fetchImgBcgDriven(); 
  };

  const fetchImgBcgDriven = () => {
    setOffset({ top: offset.top + setToTop, left: offset.left + setToLeft });
    bcgImgPos = offset.left + setToLeft;
  //  refetch();
  };

  const setAnnPosition = (val) => {
    setAnPos(val);
  }
  const calculateAnnotationPosition = () => {
    const currentDelta = Math.abs(
      mouseDownY - stageRef.current.getPointerPosition().y
    );

    if (!goUp) {
      const ret = anPos + Math.abs(currentDelta - lastDelta);
      setLastDelta(currentDelta);
      return ret > 500 ? 500 : ret;
    } else {
      const ret = anPos - Math.abs(currentDelta - lastDelta);
      setLastDelta(currentDelta);
      return ret < 0 ? 0 : ret;
    }
  };

  const calculateMovementOffset = () => {
    const currentDeltaX = Math.abs(
      mouseDownX - stageRef.current.getPointerPosition().x
    );

      if(!goRight) {
        const ret = Math.abs(currentDeltaX - lastDeltaX);
        setLastDeltaX(currentDeltaX);
        return ret;
      } else {
        const ret = Math.abs(currentDeltaX - lastDeltaX);
        setLastDeltaX(currentDeltaX);
        return -ret;
      }
  }
  
  const styles = {
    position: "relative",
    top: 70,
    marginBottom: 10,
    backgroundRepeat: "no-repeat",
    left: 0,
    backgroundImage: `url(${img})`,
  };

  return (
    <div style={styles}>
      <Stage
        width={400}
        height={400}
        onMouseDown={handleMouseDown}
        onClick={handleOnClick}
        ref={stageRef}
        className="videoGraphqlStage"
      >
        <Layer>
          <Image
            image={bcgImage}
            x={0}
            y={0}
            draggable
            onDragMove={() => {
              setAnnPosition(calculateAnnotationPosition());
              setMovementOffset(calculateMovementOffset());
              setToLeft = movementOffset;
              fetchImgBcgDriven();
            }}
            dragBoundFunc={function(pos) {
              if (prevdragYBcgMove < pos.y && !goUp) {
                setGoUp(true);
              }
              if (prevdragYBcgMove > pos.y && goUp) {
                setGoUp(false);
              }
              if (prevdragXBcgMove < pos.x && !goRight) {
                setGoRight(true);
              }
              if (prevdragXBcgMove > pos.x && goRight) {
                setGoRight(false);
              }
              setDragYBcgMove(pos.y);
              setDragXBcgMove(pos.x);
              return {
                // x: pos.x,
                x: 0,
                y: 0
              };
            }}
          />
          <Image
            image={currentZoomOut == 1 ? annotationImage : annotationImageSmall}
            x={currentZoomOut == 1 ? initialAnnX : initialAnnXSmall}
            y={ currentZoomOut == 1 ? Math.min(Math.max(anPos, 0), 100) : Math.min(Math.max(anPos, 0), 56)}
          />
        </Layer>
      </Stage>
      <Button
        onClick={
          currentZoomOut > 1
            ? () => setcurrentZoomOut(currentZoomOut => currentZoomOut - 1)
            : () => {}
        }
      >
        Zoom in</Button>
      <Button
        onClick={
          currentZoomOut < 4
            ? () => setcurrentZoomOut(currentZoomOut => currentZoomOut + 1)
            : () => {}
        }
      >
        Zoom out
      </Button>
      <br />
      <br />
      <div>Current Zoom Out: {currentZoomOut}</div>
    </div>
  );
};

// Custom Hook
function usePrevious(value) {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef();

  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current;
}

export default ImageStitching;
