class VideoWrapperManager extends Module {
    static mobileSupported = false;
    static remoteWrapperId = "remoteVideoWrapper";
    static localWrapperId = "localVideoWrapper";

    config = {
        remoteVideo: VideoWrapperManager.remoteWrapperId,
        localVideo: VideoWrapperManager.localWrapperId
    }

    #observer = new MutationObserver(this.onMutationObserved.bind(this));

    constructor(props) {
        super(props);
    }

    onPageStarted() {

        if (!ChatRegistry.isVideoChat()) {
            return;
        }

        this.wrapVideos();

        const remoteVideo = document.getElementById("remoteVideo");
        const localVideo = document.getElementById("localVideo");

        if (remoteVideo) {
            this.#observer.observe(remoteVideo, {
                subtree: false,
                childList: false,
                attributes: true,
                attributeFilter: ["style"]
            });
        }

        if (localVideo) {
            this.#observer.observe(localVideo, {
                subtree: false,
                childList: false,
                attributes: true,
                attributeFilter: ["style"]
            });
        }
    }

    onMutationObserved(mutations) {
        for (const mutation of mutations) {
            const target = mutation.target;
            const id = target.id;

            if (id === "remoteVideo" || id === "localVideo") {
                const wrapperId = this.config[id];
                this.updateWrapperDimensions(wrapperId, target);
            }
        }
    }

    updateWrapperDimensions(wrapperId, videoElement) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        wrapper.style.width = videoElement.style.width || "";
        wrapper.style.height = videoElement.style.height || "";

        if (videoElement.style.top) {
            wrapper.style.top = videoElement.style.top;
            videoElement.style.top = "";
        }
    }

    wrapVideos() {
        const remoteVideo = document.getElementById("remoteVideo");
        const localVideo = document.getElementById("localVideo");

        if (remoteVideo && !remoteVideo.parentElement.id.includes(VideoWrapperManager.remoteWrapperId)) {
            remoteVideo.wrap(`<div id='${VideoWrapperManager.remoteWrapperId}'></div>`);
            this.updateWrapperDimensions(VideoWrapperManager.remoteWrapperId, remoteVideo);
        }

        if (localVideo && !localVideo.parentElement.id.includes(VideoWrapperManager.localWrapperId)) {
            localVideo.wrap(`<div id='${VideoWrapperManager.localWrapperId}'></div>`);
            this.updateWrapperDimensions(VideoWrapperManager.localWrapperId, localVideo);
        }

        document.dispatchEvent(new CustomEvent('wrappedVideos'));
    }
}
