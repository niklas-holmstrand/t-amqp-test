import React from "react";
import { useDrag, DragPreviewImage } from "react-dnd";
import annotation from "./static/annotation.png";

const style = {
  position: "absolute",
  padding: "0.5rem 1rem",
  cursor: "move",
  backgroundImage: `url(${annotation})`,
  backgroundRepeat: "no-repeat",
  width: "83px",
  height: "54px"
};

const Box = ({ id, left, top, children }) => {
  const [{ opacity }, drag, preview] = useDrag({
    item: { id, left, top, type: "box" },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
      opacity: monitor.isDragging() ? 0 : 1,
      isOver: monitor.didDrop(),
      initialClientOffset: monitor.getInitialClientOffset(),
      clientOffset: monitor.getClientOffset(),
      differenceFromInitialOffset: monitor.getDifferenceFromInitialOffset()
    })
  });

  return (
    <>
      <DragPreviewImage connect={preview} src={annotation} />
      <div ref={drag} style={{ ...style, left, top, opacity }}>
        {children}
      </div>
    </>
  );
};
export default Box;
