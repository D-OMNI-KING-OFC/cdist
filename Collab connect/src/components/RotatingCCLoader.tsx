import React from "react";
import { motion } from "framer-motion";
import "./RotatingCCLoader.css";

type Props = {
  src?: string;
  size?: number;
};

const RotatingCCLoader: React.FC<Props> = ({ src = "../assets/cc-3d.png", size = 200 }) => {
  return (
    <motion.div
      className="cc-loader-container"
      animate={{
        rotateY: [0, 15, 0, -15, 0],
        rotateX: [0, 5, 0, -5, 0],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{ width: size, height: size }}
    >
      <img src={src} alt="CC logo loader" className="cc-logo" draggable={false} />
      <div className="cc-glow"></div>
    </motion.div>
  );
};

export default RotatingCCLoader;
