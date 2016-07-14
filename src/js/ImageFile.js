function ImageFile (settings) {
    this.filesize = settings.filesize || 0;
    this.name = settings.name || "";
    this.path = settings.path || "";
    this.b64 = settings.b64 || null;
    this.isLoaded = false;
    this.isLoading = false;
}

ImageFile.prototype.addImageData = function(data) {
    this.b64 = data;
};

ImageFile.prototype.load = function(cb) {
    var _this = this;
    this.isLoading = true;
    var img = new Image();

    img.onload = function() {
        _this.ratio = [this.width/this.height, 1];
        _this.width = this.width;
        _this.height = this.height;
        _this.img = this;
        _this.isLoaded = true;
        _this.isLoading = false;
        cb();
    };

    img.src = this.b64;
};


Image.prototype.scale = function(maxW, maxH, currW, currH) {

    var ratio = currH / currW;

    if(currW >= maxW && ratio <= 1){
        currW = maxW;
        currH = currW * ratio;
    } else if(currH >= maxH){
        currH = maxH;
        currW = currH / ratio;
    }

    return [currW, currH];

};
