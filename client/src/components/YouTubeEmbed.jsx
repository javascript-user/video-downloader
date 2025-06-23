import React from "react";

const YouTubeEmbed = ({ src }) => {
  const id = src.split("/")[src.split("/").length - 1];
  return (
    <div>
      <iframe
        width="290"
        height="150"
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube video player"
        style={{ border: "none" }}
        className="rounded-2xl"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default YouTubeEmbed;
