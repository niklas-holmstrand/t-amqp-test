import React from "react";
import { Stage, Layer, Image } from "react-konva";
import annotation from "./static/annotation.png";

const annotationWidth = 84;
const annotationHeight = 54;

/**
 * The prototype of Feeder Trimming based on live stream from the machine's camera.
 * Implemented as a class-based component for considering whether hooks or classes are more convenient.
 */
export default class BackgroundVideo extends React.Component {
  constructor() {
    super();

    this.image = React.createRef();
    this.videoCanvas = React.createRef();
    this.bcgImage = React.createRef();

    let annImg = new window.Image();
    annImg.src = annotation;

    this.state = {
      video: null,
      loading: false,
      data: null,
      initalImage: new window.Image(),
      annotationImage: annImg,
      leftTop: 800,
      annotationPosition: {
        x: 250,
        y: 250
      },
      backgroundImage: new window.Image(),
      anime: false
    };
  }

  componentDidMount() {
    this.fetchInitialImage();

    const video = document.createElement("video");
    video.id = "bcgVideo";

    this.setState({
      video: video
    });

    video.addEventListener("canplay", () => {
      this.setState({
        anime: true
      });
      video.playbackRate = 2.0;
      video.play();
      this.videoCanvas.getLayer().batchDraw();
      this.requestUpdate();
    });

    video.addEventListener("ended", () => {
      this.fetchBcgImage();
      this.setState({
        anime: false
      });
    });
  }

  fetchInitialImage = () => {
    fetch("http://10.1.1.126:3001/init", { method: "GET" })
      .then(response => response.json())
      .then(img => {
        this.state.initalImage.src = img; // this shouldn't be set as it is in here, use setState in production code
        this.state.initalImage.onload = () => {
          this.image.getLayer().batchDraw();
        };
      });
  };

  fetchBcgImage = () => {
    fetch(`http://10.1.1.126:3001/bcgImg?x=${this.state.leftTop}`, {
      method: "GET"
    })
      .then(response => response.json())
      .then(img => {
        this.state.backgroundImage.src = img;
      });
  };

  fetchVideo = e => {
    const { leftTop } = this.state;

    let toLeftSlow = leftTop - 100 + (annotationWidth / 2);
    let toLeftFast = leftTop - 350 + (annotationWidth / 2);
    let toRightSlow = leftTop + 100 + (annotationWidth / 2);
    let toRightFast = leftTop + 350 + (annotationWidth / 2);

    const maxLeft = 1499;
    const minLeft = 801;

    if (e.currentTarget.getPointerPosition().x < 20) {
      toLeftFast = Math.min(Math.max(toLeftFast, minLeft), maxLeft);
      this.fetchBcgImage(toLeftFast);
      this.state.video.src = `http://10.1.1.126:3001/video?from=${leftTop}&to=${toLeftFast}`;
      this.setState({
        leftTop: toLeftFast
      });
    } else if (e.currentTarget.getPointerPosition().x < 50) {
      toLeftSlow = Math.min(Math.max(toLeftSlow, minLeft), maxLeft);
      this.fetchBcgImage(toLeftSlow);
      this.state.video.src = `http://10.1.1.126:3001/video?from=${leftTop}&to=${toLeftSlow}`;
      this.setState({
        leftTop: toLeftSlow
      });
    } else if (e.currentTarget.getPointerPosition().x > 480) {
      toRightFast = Math.min(Math.max(toRightFast, minLeft), maxLeft);
      this.fetchBcgImage(toRightFast);
      this.state.video.src = `http://10.1.1.126:3001/video?from=${leftTop}&to=${toRightFast}`;
      this.setState({
        leftTop: toRightFast
      });
    } else if (e.currentTarget.getPointerPosition().x > 450) {
      toRightSlow = Math.min(Math.max(toRightSlow, minLeft), maxLeft);
      this.fetchBcgImage(toRightSlow);
      this.state.video.src = `http://10.1.1.126:3001/video?from=${leftTop}&to=${toRightSlow}`;
      this.setState({
        leftTop: toRightSlow
      });
    } else {
      this.fetchBcgImage(
        leftTop + -(250 - e.currentTarget.getPointerPosition().x)
      );
      this.state.video.src = `http://10.1.1.126:3001/video?from=${leftTop}&to=${leftTop +
        -(250 - e.currentTarget.getPointerPosition().x + (annotationWidth / 2))}`;
      this.setState({
        leftTop: leftTop + -(250 - e.currentTarget.getPointerPosition().x + (annotationWidth / 2)) 
      });
      this.setState({
        annotationPosition: {
          y: e.currentTarget.getPointerPosition().y - (annotationHeight / 2)
        }
      });
    }
  };

  requestUpdate = () => {
    if (this.videoCanvas && this.videoCanvas.getLayer && this.state.anime) {
      this.videoCanvas.getLayer().batchDraw();
      requestAnimationFrame(this.requestUpdate);
    }
  };

  render() {
    if (!this.state.video || this.state.video.src == "") {
      return (
        <Stage width={500} height={500} onClick={this.fetchVideo}>
          <Layer>
            <Image
              ref={node => {
                this.image = node;
              }}
              x={0}
              y={0}
              width={500}
              height={500}
              image={this.state.initalImage}
            />
            <Image
              image={this.state.annotationImage}
              x={250}
              y={this.state.annotationPosition.y}
            />
          </Layer>
        </Stage>
      );
    } else {
      return (
        <Stage width={500} height={500} onClick={this.fetchVideo}>
          <Layer>
            <Image
              x={0}
              y={0}
              width={500}
              height={500}
              image={this.state.backgroundImage}
            />
            <Image
              ref={node => {
                this.videoCanvas = node;
              }}
              x={0}
              y={0}
              width={500}
              height={500}
              image={this.state.video}
            />

            <Image
              image={this.state.annotationImage}
              x={250}
              y={this.state.annotationPosition.y}
            />
          </Layer>
        </Stage>
      );
    }
  }
}
