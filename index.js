import React, { Component } from "react";
import PropTypes from "prop-types";
import {
  View,
  StyleSheet,
  PanResponder,
  ViewPropTypes,
  TouchableWithoutFeedback,
  Dimensions,
  Platform
} from "react-native";

const { height: sHeight } = Dimensions.get("screen");
// Fallback when RN version is < 0.44
const viewPropTypes = ViewPropTypes || View.propTypes;
const initialState = {
  scale: 1,
  lastScale: 1,
  offsetX: 0,
  offsetY: 0,
  lastX: 0,
  lastY: 0,
  lastMovePinch: false
};
export default class PinchZoomView extends Component {
  static propTypes = {
    ...viewPropTypes,
    scalable: PropTypes.bool,
    minScale: PropTypes.number,
    maxScale: PropTypes.number
  };

  static defaultProps = {
    scalable: true,
    minScale: 0.5,
    maxScale: 2,
    exit: () => null
  };

  constructor(props) {
    super(props);
    this.state = {
      ...initialState
    };
    this.distant = 150;
  }

  componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminationRequest: evt => true,
      onShouldBlockNativeResponder: evt => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return gestureState.dx != 0 && gestureState.dy != 0;
      }
    });
  }

  _handleStartShouldSetPanResponder = (e, gestureState) => {
    // don't respond to single touch to avoid shielding click on child components
    return false;
  };

  _handleMoveShouldSetPanResponder = (e, gestureState) => {
    return (
      this.props.scalable &&
      (Math.abs(gestureState.dx) > 2 ||
        Math.abs(gestureState.dy) > 2 ||
        gestureState.numberActiveTouches === 2)
    );
  };

  _handlePanResponderGrant = (e, gestureState) => {
    if (gestureState.numberActiveTouches === 2) {
      let dx = Math.abs(
        e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX
      );
      let dy = Math.abs(
        e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY
      );
      let distant = Math.sqrt(dx * dx + dy * dy);
      this.distant = distant;
    }
  };
  _handlePanResponderEnd = (e, gestureState) => {
    const DY_LIMIT = sHeight * 0.35;
    if (this.state.scale === 1) {
      //console.log({ dety: this.state.dy });

      if (this.state.dy > DY_LIMIT) {
        this.props.exit();
      }
      this.setState({
        offsetX: 0,
        offsetY: 0,
        lastX: 0,
        lastY: 0,
        lastScale: this.state.scale
      });
    } else {
      this.setState({
        lastX: this.state.offsetX,
        lastY: this.state.offsetY,
        lastScale: this.state.scale
      });
    }
  };

  _handlePanResponderMove = (e, gestureState) => {
    // zoom
    if (gestureState.numberActiveTouches === 2) {
      let dx = Math.abs(
        e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX
      );
      let dy = Math.abs(
        e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY
      );
      let distant = Math.sqrt(dx * dx + dy * dy);
      let scale = (distant / this.distant) * this.state.lastScale;
      //check scale min to max hello
      if (scale < this.props.maxScale && scale > this.props.minScale) {
        this.setState({ scale, lastMovePinch: true });
      }
    }
    // translate
    else if (gestureState.numberActiveTouches === 1) {
      if (this.state.lastMovePinch) {
        gestureState.dx = 0;
        gestureState.dy = 0;
      }
      const { dx, dy, vy, moveY } = gestureState;
      // console.log({ sHeight });

      //console.log({ dx, vy, dy, moveY });
      //TODO: improve  the willness to leave the zoom
      //Fast or too much
      const exitSpeed = Platform.OS === "ios" ? 5 : 3;

      //
      const { lastScale, scale, lastMovePinch } = this.state;
      let offsetX = this.state.offsetX;
      if (lastMovePinch || (scale !== 1 || lastScale !== 1)) {
        offsetX = this.state.lastX + gestureState.dx / this.state.scale;
      } else {
        if (
          Math.abs(vy) > exitSpeed ||
          Math.abs(sHeight / 2 - moveY) > (sHeight / 2) * 0.8
        ) {
          //console.log("Swipe out y");
          this.props.exit();
        }
      }

      let offsetY = this.state.lastY + gestureState.dy / this.state.scale;

      // if ( offsetX < 0  || offsetY <  0 )
      this.setState({
        offsetX,
        offsetY,
        lastMovePinch: false,
        dy: Math.abs(dy)
      });
    }
  };
  _handleResetZoomScale = (event: any) => {
    this.setState({ ...initialState });
  };
  render() {
    return (
      <View
        {...this.gestureHandlers.panHandlers}
        style={[
          styles.container,
          this.props.style,
          {
            transform: [
              { scaleX: this.state.scale },
              { scaleY: this.state.scale },
              { translateX: this.state.offsetX },
              { translateY: this.state.offsetY }
            ]
          }
        ]}
      >
        <TouchableWithoutFeedback
          onPress={this._handleResetZoomScale}
          style={styles.container}
        >
          {this.props.children}
        </TouchableWithoutFeedback>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
