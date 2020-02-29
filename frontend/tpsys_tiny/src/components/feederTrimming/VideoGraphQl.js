import React, { useEffect, useState, useRef } from "react";
import { useQuery, useSubscription } from "react-apollo-hooks";
import { QUERY_TRIM_FEEDER_IMG_OFFSET, GET_TEST_QUERY, EVENT_HAPPENED, QUERY_MOVE_CAM_X } from "../../utils/graphql";
import { Stage, Layer, Image } from "react-konva";
import useImage from "use-image";
import annotation from "./static/annotation.png";
import _ from "lodash";

var setToLeft = 0;
var setToTop = 0;
const machineId = 0;
const initialAnnX = 250;
const initialAnnY = 250;
const annotationWidth = 84;
const annotationHeight = 54;

var anPos = 250;
var lastDelta = 0;
var movementOffset = 0;
var lastDeltaX = 0;
var dragYBcgMove = 0;
var dragXBcgMove = 0;
var bcgImgPos = -800;
/**
 * The prototype of Feeder Trimming based on GraphQl subscription
 */
const VideoGraphQl = () => {

  const [mouseDownY, setMouseDownY] = useState(0);
  //const [lastDelta, setLastDelta] = useState(0);
  const [mouseDownX, setMouseDownX] = useState(0);
  //const [lastDeltaX, setLastDeltaX] = useState(0);
  const [goUp, setGoUp] = useState(true);
  const [goRight, setGoRight] = useState(true);
  // const [dragYBcgMove, setDragYBcgMove] = useState(0);
  // const [dragXBcgMove, setDragXBcgMove] = useState(0);
  // const [annPosition, setAnnPosition] = useState({
  //   x: initialAnnX,
  //   y: initialAnnY
  // });
  //const [movementOffset, setMovementOffset] = useState(0);
  const [bcgPosition, setBcgPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({
    top: 0,
    left: 800
  });

  const stageRef = useRef(null);
  const [img, setImg] = useState("");
  const [bcgImage] = useImage(img);
  const prevdragYBcgMove = usePrevious(dragYBcgMove);
  const prevdragXBcgMove = usePrevious(dragXBcgMove);
  const [annotationImage] = useImage(annotation);

  // const { data, error, loading, refetch } = useQuery(
  //   QUERY_TRIM_FEEDER_IMG_OFFSET,
  //   {
  //     variables: { machineId: machineId, x: offset.left, y: offset.top }
  //   }
  // );

  useQuery(
    QUERY_MOVE_CAM_X,
    {
      variables: { x: offset.left }
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

  const eventHappenedSub = useSubscription(EVENT_HAPPENED);

  useEffect(() => {
    if(eventHappenedSub.loading) console.log(`subscription loading`);
    else if(eventHappenedSub.error) console.log(`subscription error`);
    else {
      setImg(eventHappenedSub.data.eventHappened.feederImgBase64);
      setBcgPosition({ x: 0, y: 0 });
    }
  }, [eventHappenedSub.data, eventHappenedSub.error, eventHappenedSub.loading]);

  const handleMouseDown = e => {
    var stage = e.currentTarget;
    setMouseDownY(stage.getPointerPosition().y);
    setLastDelta(0);
    setMouseDownX(stage.getPointerPosition().x);
    setLastDeltaX(0);
  };

  const handleOnClick = e => {
    const p1 = initialAnnX - e.currentTarget.getPointerPosition().x + (annotationWidth / 2);
    setAnnPosition(e.currentTarget.getPointerPosition().y - (annotationHeight / 2));
    setToLeft = -p1;
    fetchImgBcgDriven(); 
  };

  const fetchImgBcgDriven = () => {
    setOffset({ top: offset.top + setToTop, left: offset.left + setToLeft });
    bcgImgPos = offset.left + setToLeft;
  //  refetch();
  };

  const setAnnPosition = (val) => {
    anPos = val;
  }
  const calculateAnnotationPosition = () => {
    const currentDelta = Math.abs(
      mouseDownY - stageRef.current.getPointerPosition().y
    );

    if (!goUp) {
      const ret = anPos + Math.abs(currentDelta - lastDelta);
      setLastDelta(currentDelta);
      return ret > 445 ? 445 : ret;
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
    top: 20,
    width: 500,
    marginBottom: 10,
    backgroundRepeat: "no-repeat",
    left: 0,
    backgroundImage: `url(${img})`,
  //  backgroundPositionX: -bcgImgPos
  };

 // console.log(`rerender ${bcgPosition.x}`)
  return (
    <div style={styles}>
      <Stage
        width={500}
        height={500}
        onMouseDown={handleMouseDown}
        onClick={handleOnClick}
        ref={stageRef}
        className="videoGraphqlStage"
      >
        <Layer>
          {/* <Image x={0} y={0} width={500} height={500} image={bcgImage} /> */}
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
            image={annotationImage}
            x={initialAnnX}
            y={anPos}
            draggable
            onDragEnd={e => {
              setAnnPosition(e.target.y());
            }}
            dragBoundFunc={function(pos) {
              return {
                x: initialAnnX,
                y: pos.y
              };
            }}
          />
        </Layer>
      </Stage>
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

export default VideoGraphQl;
