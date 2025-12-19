import React from "react";
import "./loading.css";

const LoadingScreen: React.FC = () => {
  return (
    <div className="loaderContainer">
      <div className="loaderLogoWrap">
        <img src="/src/assets/ccemb.svg" alt="Loading..." className="loaderLogo" />
      </div>
      <p className="loaderText">INITIALIZING</p>
      <div className="loaderDots">
        <div className="loaderDot"></div>
        <div className="loaderDot"></div>
        <div className="loaderDot"></div>
      </div>
      <div className="loaderProgressBar">
        <div className="loaderProgressFill"></div>
      </div>
    </div>
  );
};

export default LoadingScreen;
