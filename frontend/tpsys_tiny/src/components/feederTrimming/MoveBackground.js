import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "react-apollo-hooks";
import { QUERY_TRIM_FEEDER_IMG_OFFSET } from "../../utils/graphql";
import { Stage, Layer, Image } from "react-konva";
import useImage from "use-image";
import annotation from "./static/annotation.png";

var setToLeft = 0;
var setToTop = 0;
const machineId = 0;
const initialAnnX = 250;
const initialAnnY = 250;
const annotationWidth = 84;
const annotationHeight = 54;
/**
 * The prototype of Feeder Trimming based on moving with the background represented by an image from the machine's camera
 */
const MoveBackground = () => {

  const [leftOffset, setLeftOffset] = useState(0);
  const [mouseDownY, setMouseDownY] = useState(0);
  const [lastDelta, setLastDelta] = useState(0);
  const [goUp, setGoUp] = useState(true);
  const [dragYBcgMove, setDragYBcgMove] = useState(0);
  const [annPosition, setAnnPosition] = useState({
    x: initialAnnX,
    y: initialAnnY
  });
  const [bcgPosition, setBcgPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({
    top: 0,
    left: 0
  });

  const stageRef = useRef(null);
  const [img, setImg] = useState("");
  const [bcgImage] = useImage(img);
  const prevdragYBcgMove = usePrevious(dragYBcgMove);
  const [annotationImage] = useImage(annotation);

  const { data, error, loading, refetch } = useQuery(
    QUERY_TRIM_FEEDER_IMG_OFFSET,
    {
      variables: { machineId: machineId, x: offset.left, y: offset.top }
    }
  );

  useEffect(() => {
    if (data && data.getFeederImageOffset) {
      setImg(data.getFeederImageOffset.feederImgBase64);
      setOffset({
        top: data.getFeederImageOffset.y,
        left: data.getFeederImageOffset.x
      });
      setLeftOffset(0);
      setBcgPosition({ x: 0, y: 0 });
    }
  }, [data, error, loading]);

  const handleMouseDown = e => {
    var stage = e.currentTarget;
    setMouseDownY(stage.getPointerPosition().y);
    setLastDelta(0);
  };

  const handleOnClick = e => {
    const p1 = initialAnnX - e.currentTarget.getPointerPosition().x + (annotationWidth / 2);
    setAnnPosition({ y: e.currentTarget.getPointerPosition().y - (annotationHeight / 2) });
    setBcgPosition({
      x: initialAnnX - e.currentTarget.getPointerPosition().x,
      y: 0
    });
    setToLeft = -p1;
    fetchImgBcgDriven();
  };

  const fetchImgBcgDriven = () => {
    setOffset({ top: offset.top + setToTop, left: offset.left + setToLeft });
    //refetch();
  };

  const calculateAnnotationPosition = () => {
    const currentDelta = Math.abs(
      mouseDownY - stageRef.current.getPointerPosition().y
    );

    if (!goUp) {
      const ret = annPosition.y + Math.abs(currentDelta - lastDelta);
      setLastDelta(currentDelta);
      return ret > 445 ? 445 : ret;
    } else {
      const ret = annPosition.y - Math.abs(currentDelta - lastDelta);
      setLastDelta(currentDelta);
      return ret < 0 ? 0 : ret;
    }
  };

  const styles = {
    position: "relative",
    top: 20,
    marginBottom: 10,
    backgroundRepeat: "no-repeat",
    left: -leftOffset
  };

  console.log(`bcgPosition.x: ${bcgPosition.x}`);
  return (
    <div style={styles}>
      <Stage
        width={500}
        height={500}
        onMouseDown={handleMouseDown}
        onClick={handleOnClick}
        ref={stageRef}
      >
        <Layer>
          <Image
            image={bcgImage}
            x={bcgPosition.x}
            y={0}
            draggable
            onDragEnd={e => {
              setBcgPosition({ x: e.target.x(), y: 0 });
              setToLeft = -e.target.x();
              fetchImgBcgDriven();
            }}
            onDragMove={() => {
              setAnnPosition({ y: calculateAnnotationPosition() });
            }}
            dragBoundFunc={function(pos) {
              if (prevdragYBcgMove < pos.y && !goUp) {
                setGoUp(true);
              }
              if (prevdragYBcgMove > pos.y && goUp) {
                setGoUp(false);
              }
              setDragYBcgMove(pos.y);
              return {
                x: pos.x,
                y: 0
              };
            }}
          />
          <Image
            image={annotationImage}
            x={initialAnnX}
            y={annPosition.y}
            draggable
            onDragEnd={e => {
              setAnnPosition({ x: initialAnnX, y: e.target.y() });
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

export default MoveBackground;
