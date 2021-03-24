import React, { useState, useEffect } from 'react';
// @ts-ignore
import { CircleSlider } from 'react-circle-slider';

const GainSlider = () => {
  const [gain, setGain] = useState(1);

  useEffect(() => {}, [gain]);

  return (
    <CircleSlider
      value={gain}
      size={200}
      knobRadius={10}
      progressWidth={15}
      circleWidth={25}
      progressColor="#6AB6E1"
      circleColor="#333"
      stepSize={1}
      max={10}
      min={1}
      showTooltip={true}
      tooltipColor="white"
      onChange={setGain}
    />
  );
};

export default GainSlider;
