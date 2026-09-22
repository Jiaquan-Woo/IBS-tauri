import { SVG } from "./svg.js/main.js";
import "./svg.js/svg.draggable.js";
import IbsUtils from "./IbsUtils.js";
import Line from "./Line.js";
import { methodsTable } from "./methodsTable.js";
import { Text } from "./Text.js";
import { Container } from "./Container.js";

function Site(siteOption, parent) {
  this.parent = parent;
  this.children = [];
  let { option, config } = this.standarizeOptionAndConfig(siteOption);
  this.option = option;
  this.config = config;
  this.nodes = this.createNodes();
  this.nodesIndex = parent.children.length;
  this.parent.nodes.appendChild(this.nodes);
  if (this.parent.config.editable) {
    this.children[0].children[8].updateCloneNode();
    this.draggable();
  }
}

Site.prototype.standarizeOptionAndConfig = function (
  siteOption,
  updateId = true
) {
  let resetCx =
    siteOption.location && !(siteOption.coordinate && siteOption.coordinate.cx);
  let defaultOption = this.parent.getDefaultOption("site");
  let option = IbsUtils.supplementToStandardObj(defaultOption, siteOption);
  if (updateId) {
    option.id = IbsUtils.getRandomId("Site");
  }
  option.displayName = option.displayName ? option.displayName : option.id;
  option.editable = this.parent.parent.config.editable;
  option.width = Math.max(1, parseInt(option.width));
  option.height = Math.max(1, parseInt(option.height));
  option.text.style.fontSize = Math.max(0, option.text.style.fontSize);
  option.style.borderSize = Math.max(0, parseInt(option.style.borderSize));
  let config = {
    type: "site",
  };
  let locations = (option.location + "").split(";");
  for (let i = 0; i < locations.length; i++) {
    let site = Math.min(
      this.parent.option.position.end.site,
      parseInt(locations[i])
    );
    site = Math.max(this.parent.option.position.start.site, site);
    locations[i] = site;
  }
  if (resetCx) {
    let sumLocation = locations.reduce((total, num) => {
      return total + num;
    });
    let meanLocation = sumLocation / locations.length;
    option.coordinate.cx =
      (meanLocation - this.parent.option.position.start.site) *
        this.parent.config.lengthRatio +
      this.parent.option.coordinate.horizontal.start;
  }
  if (
    option.shape == "circle" ||
    option.shape == "roundRect" ||
    option.shape == "rect"
  ) {
    var { sidePoints, centerPoint } = IbsUtils.calRectEightPointsWithRotate(
      option.coordinate.cx,
      option.coordinate.cy,
      option.width,
      option.height,
      option.style.rotate
    );
  } else {
    var { sidePoints, centerPoint } = IbsUtils.calRectEightPoints(
      option.coordinate.cx,
      option.coordinate.cy,
      option.width,
      option.height
    );
  }
  config.sidePoints = sidePoints;
  config.centerPoint = centerPoint;
  config.nodePosition = {
    cx: option.coordinate.cx,
    cy: option.coordinate.cy,
  };
  option.location = locations.join(";");
  if (option.shape == "none") {
    option.text.position = "top";
  }
  return {
    option,
    config,
  };
};

Site.prototype.createNodes = function () {
  let groupAttr = {
    id: this.option.id + "Group",
  };
  let group = IbsUtils.createSvgElement("g", groupAttr);

  let contentGroupAttr = {
    id: this.option.id + "ContentGroup",
  };
  let contentGroup = IbsUtils.createSvgElement("g", contentGroupAttr);

  let ref = this.createReferencePoint();
  ref.setAttribute("visibility", "hidden");

  let content = this.createContent();
  this.config.contentNode = content;

  let container = this.option.editable ? this.createContainer() : null;
  this.children.push(container);

  let texture = this.createTexture();
  this.config.textureNode = texture;

  var text = this.createText();
  this.children.push(text);

  let lines = this.createSiteLine();
  this.config.siteLines = lines;
  for (let i = 0; i < this.config.siteLines.length; i++) {
    group.appendChild(lines[i].nodes);
  }

  contentGroup.appendChild(content);
  if (container) {
    contentGroup.appendChild(container.nodes);
  }
  contentGroup.appendChild(texture);
  contentGroup.appendChild(ref);

  this.config.contentGroup = contentGroup;
  if (this.option.text.content) {
    contentGroup.appendChild(text.nodes);
  }
  group.appendChild(contentGroup);
  if (container) {
    contentGroup.appendChild(container.children[8].config.cloneNode);
    IbsUtils.showBorderByMousedown(contentGroup, container.nodes);
    IbsUtils.showBorderAlone(container.nodes);
  }
  this.parent.parent.config.selected = this;
  contentGroup.addEventListener("mousedown", () => {
    this.parent.parent.config.selected = this;
    this.parent.parent.config.isHideAll = false;
    this.parent.parent.config.selectedMolecular = this.parent;
  });
  if (this.option.shape == "none" && this.option.text.content != "") {
    content.setAttribute("class", "nodeBorder");
    IbsUtils.showBorderByMousedown(contentGroup, content);
    IbsUtils.showBorderAlone(content);
  }
  text.config.textNode.removeAttribute("svgjs:data");
  return group;
};

Site.prototype.createContent = function () {
  let contentOption = methodsTable[this.option.shape].call(
    this,
    this.config.sidePoints
  );
  if (contentOption.points) {
    let pointString = [];
    for (let i = 0; i < contentOption.points.length; i++) {
      let coor = contentOption.points[i];
      let res;
      if (
        this.option.shape == "roundRect" ||
        this.option.shape == "circle" ||
        this.option.shape == "rect"
      ) {
        res = contentOption.points[i];
      } else {
        res = IbsUtils.calculatePointAfterRotate(
          this.option.coordinate.cx,
          this.option.coordinate.cy,
          coor[0],
          coor[1],
          this.option.style.rotate
        );
      }
      pointString.push(res.join(" "));
    }
    contentOption.points = pointString.join(" ");
  }
  contentOption.id = this.option.id + "_shape";
  let gradientUrl = this.parent.parent.getGradientUrl(
    this.option.style.gradient,
    this.option.style.color
  );
  contentOption.style = `fill:url(#${gradientUrl});stroke:${this.option.style.borderColor};stroke-width:${this.option.style.borderSize};`;
  if (this.option.style.isDash) {
    contentOption["stroke-dasharray"] = "6 4";
  }
  let content = IbsUtils.createShape(this.option.shape, contentOption);
  return content;
};

Site.prototype.createContainer = function () {
  let containerOption = {
    position: {
      cx: this.option.coordinate.cx,
      cy: this.option.coordinate.cy,
    },
    width: this.option.width,
    height: this.option.height,
    id: this.option.id + "Container",
  };
  let container = new Container(containerOption, this);
  if (this.option.shape == "none") {
    container.nodes.style.visibility = "hidden";
  }
  return container;
};

Site.prototype.createText = function () {
  let textOption = this.standarizeTextOption(this.option.text);
  textOption.style.borderColor = textOption.style.color;
  textOption.editable = false;
  let text = new Text(textOption, this);
  if (this.option.text.position == "hide") {
    text.nodes.setAttribute("visibility", "hidden");
  }
  return text;
};

Site.prototype.createTexture = function () {
  var texture = this.config.contentNode.cloneNode();
  var textureUrl = this.parent.parent.getTextureUrl(
    this.option.style.texture.type,
    this.option.style.texture.color
  );
  let fillTexture = textureUrl ? `url(#${textureUrl})` : "none";
  texture.style = `stroke-width:0;fill:${fillTexture};`;
  texture.setAttribute("id", `${this.option.id}Texture`);
  return texture;
};

Site.prototype.createReferencePoint = function () {
  let pointAttr = {
    cx: this.option.coordinate.cx,
    cy: this.option.coordinate.cy,
    r: 1,
    fill: "#000000",
  };
  let point = IbsUtils.createSvgElement("circle", pointAttr);
  this.config.ref = point;
  return point;
};

Site.prototype.standarizeTextOption = function (option) {
  let textOption = {};
  let position = {};
  var contentBox = SVG(this.config.contentNode).bbox();
  position.x = contentBox.cx;
  switch (option.position.toLowerCase()) {
    case "center":
      position.y = contentBox.cy;
      break;
    case "top":
      position.y = contentBox.cy - contentBox.height * 0.5 - 10;
      break;
    case "bottom":
      position.y = contentBox.cy + contentBox.height * 0.5 + 20;
      break;
    case "hide":
      position.y = contentBox.cy;
      break;
  }
  textOption.content = option.content;
  textOption.style = {};
  for (let key in option.style) {
    if (key == "position") {
      continue;
    }
    textOption.style[key] = option.style[key];
  }
  textOption.position = position;
  textOption.style.alignmentBaseline = "central";
  return textOption;
};

Site.prototype.createSiteLine = function () {
  let siteLines = [];
  let positionArray = this.option.location.split(";");
  let length = positionArray.length;
  let startCoor;
  let endCoor;
  for (let i = 0; i < positionArray.length; i++) {
    if (this.option.shape == "none" && this.option.text.content) {
      let nbox = SVG(this.children[1].nodes).bbox();
      let step = (nbox.width / (length - 1)) * i;
      if (length != 1) {
        endCoor = [
          this.children[1].option.position.x - nbox.width * 0.5 + step,
          this.children[1].option.position.y + 0.5 * nbox.height,
        ];
      } else {
        endCoor = [
          this.children[1].option.position.x,
          parseFloat(nbox.y) + parseFloat(nbox.height),
        ];
      }
    } else {
      endCoor = [this.option.coordinate.cx, this.option.coordinate.cy];
    }
    let startY =
      this.option.coordinate.cy < this.parent.option.coordinate.vertical.start
        ? this.parent.option.coordinate.vertical.start
        : this.parent.option.coordinate.vertical.start +
          this.parent.option.style.height;
    let startX =
      this.parent.option.coordinate.horizontal.start +
      (parseInt(positionArray[i]) - this.parent.option.position.start.site) *
        this.parent.config.lengthRatio;
    startCoor = [startX, startY];
    if (
      endCoor[1] >
      this.parent.option.coordinate.vertical.start +
        this.parent.option.style.height * 0.5
    ) {
      let dist = Math.abs(endCoor[1] - startCoor[1]);
      var midCoor = [startCoor[0], startCoor[1] + Math.min(25, dist * 0.3 + 12)];
    } else {
      let dist = Math.abs(endCoor[1] - startCoor[1]);
      var midCoor = [startCoor[0], startCoor[1] - Math.min(25, dist * 0.3 + 12)];
    }
    let position =
      startCoor.join(",") + " " + midCoor.join(",") + " " + endCoor.join(",");
    let lineOption = {
      type: "polyline",
      pointsNum: 3,
      id: "",
      position,
      editable: false,
    };
    let line = new Line(lineOption, this);
    siteLines.push(line);
  }
  return siteLines;
};

Site.prototype.draggable = function () {
  var self = this;
  var contentGroupNode = this.config.contentGroup;
  var text = this.children[1].config.textNode;
  var svg = contentGroupNode.ownerSVGElement || contentGroupNode.closest('svg');

  function svgFromScreen(cx, cy) {
    if (!svg) return { x: cx, y: cy };
    var pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    var ctm = svg.getScreenCTM();
    if (ctm) {
      var inv = ctm.inverse();
      var sp = pt.matrixTransform(inv);
      return { x: sp.x, y: sp.y };
    }
    return { x: cx, y: cy };
  }

  var startClient = null;
  var startSvg = null;
  var startPos = null;
  var dragging = false;

  contentGroupNode.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    self.parent.parent.config.isUndo = false;
    let operation = {
      target: self,
      cmd: "drag",
      args: JSON.stringify(self.option),
      nodesIndex: self.nodesIndex,
    };
    self.parent.parent.config.undoStack.push(operation);
    var sp = svgFromScreen(e.clientX, e.clientY);
    startClient = { x: e.clientX, y: e.clientY };
    startSvg = { x: sp.x, y: sp.y };
    startPos = {
      cx: self.option.coordinate.cx,
      cy: self.option.coordinate.cy
    };
    dragging = false;
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!startClient) return;
    var clientDx = e.clientX - startClient.x;
    var clientDy = e.clientY - startClient.y;
    if (!dragging) {
      if (Math.abs(clientDx) < 3 && Math.abs(clientDy) < 3) return;
      dragging = true;
    }
    var sp = svgFromScreen(e.clientX, e.clientY);
    var svgDx = sp.x - startSvg.x;
    var svgDy = sp.y - startSvg.y;
    var newCx = Math.round((startPos.cx + svgDx) * 100) / 100;
    var newCy = Math.round((startPos.cy + svgDy) * 100) / 100;

    contentGroupNode.setAttribute('transform', 'translate(' + svgDx + ',' + svgDy + ')');

    var textX = parseFloat(text.getAttribute('x'));
    var textY = parseFloat(text.getAttribute('y'));
    self.children[1].Move(textX, textY, false);

    var positionArray = self.option.location.split(';');
    var length = positionArray.length;
    for (var i = 0; i < self.config.siteLines.length; i++) {
      var endX;
      var endY;
      var startX =
        self.parent.option.coordinate.horizontal.start +
        (parseInt(positionArray[i]) - self.parent.option.position.start.site) *
          self.parent.config.lengthRatio;
      var isBelow =
        newCy >=
        self.parent.option.coordinate.vertical.start +
          self.parent.option.style.height * 0.5;
      var lineY = isBelow
        ? self.parent.option.coordinate.vertical.start +
          self.parent.option.style.height
        : self.parent.option.coordinate.vertical.start;
      self.config.siteLines[i].reshape(0, startX, lineY, true);
      self.config.siteLines[i].reshape(1, startX, isBelow ? lineY + 12 : lineY - 12, true);
      if (self.option.shape == 'none' && self.option.text.content) {
        var nbox = SVG(self.children[1].nodes).bbox();
        if (length == 2) {
          endY = self.children[1].option.position.y + 0.5 * nbox.height;
          endX =
            self.children[1].option.position.x -
            nbox.width * 0.5 +
            (nbox.width / (self.config.siteLines.length - 1)) * i -
            5;
          if (isBelow) endY = nbox.y;
        } else {
          endY = isBelow ? nbox.y : parseFloat(nbox.y) + parseFloat(nbox.height);
          endX = nbox.cx;
        }
      } else {
        endX = newCx;
        endY = newCy;
      }
      self.config.siteLines[i].reshape(2, endX, endY, true);
    }

    self.option.coordinate.cx = newCx;
    self.option.coordinate.cy = newCy;
    self.config.nodePosition.cx = newCx;
    self.config.nodePosition.cy = newCy;
    if (self.children[0]) {
      self.children[0].updateNodePosition();
    }
  });

  document.addEventListener('mouseup', function () {
    if (startClient) {
      startClient = null;
      startSvg = null;
      startPos = null;
      dragging = false;
    }
  });
};

Site.prototype.reshape = function (width, height, rotate) {
  if (width) {
    this.option.width = width;
  }
  if (height) {
    this.option.height = height;
  }
  if (rotate) {
    this.option.style.rotate = rotate;
  }
  let ref = SVG(this.config.ref).bbox();
  if (
    this.option.shape == "roundRect" ||
    this.option.shape == "circle" ||
    this.option.shape == "rect"
  ) {
    let res = IbsUtils.calRectEightPointsWithRotate(
      this.option.coordinate.cx,
      this.option.coordinate.cy,
      this.option.width,
      this.option.height,
      this.option.style.rotate
    );
    this.config.sidePoints = res.sidePoints;
  } else {
    let res = IbsUtils.calRectEightPoints(
      this.option.coordinate.cx,
      this.option.coordinate.cy,
      this.option.width,
      this.option.height
    );
    this.config.sidePoints = res.sidePoints;
  }
  let contentOption = methodsTable[this.option.shape].call(
    this,
    this.config.sidePoints
  );

  if (contentOption.points) {
    let rotatePoints = [];
    if (
      this.option.shape == "roundRect" ||
      this.option.shape == "circle" ||
      this.option.shape == "rect"
    ) {
      rotatePoints = contentOption.points;
    } else {
      for (let i = 0; i < contentOption.points.length; i++) {
        let coor = contentOption.points[i];
        let res = IbsUtils.calculatePointAfterRotate(
          this.option.coordinate.cx,
          this.option.coordinate.cy,
          coor[0],
          coor[1],
          this.option.style.rotate
        );
        rotatePoints.push(res);
      }
    }
    SVG(this.config.contentNode).plot(rotatePoints);
    SVG(this.config.textureNode).plot(rotatePoints);
  }
  this.adjustTextPosition();
};

Site.prototype.updateTransform = function (x, y, rotate) {
  let angel = rotate - this.option.style.rotate;
  this.option.style.rotate = rotate;
  let { sidePoints, centerPoint } = IbsUtils.calRectEightPointsWithRotate(
    this.option.coordinate.cx,
    this.option.coordinate.cy,
    this.option.width,
    this.option.height,
    this.option.style.rotate
  );
  this.config.sidePoints = sidePoints;
  this.reshape(null, null, rotate);
  this.children[0].updateTransform(angel);
};

Site.prototype.updateNodePosition = function () {
  let contentGroupNode = this.config.contentGroup;
  let transform = contentGroupNode.getAttribute('transform');
  let groupX = 0;
  let groupY = 0;
  if (transform) {
    let match = transform.match(/translate\(([^,]+),([^)]+)\)/);
    if (match) {
      groupX = parseFloat(match[1]);
      groupY = parseFloat(match[2]);
    }
  }
  let refCx = parseFloat(this.config.ref.getAttribute("cx"));
  let refCy = parseFloat(this.config.ref.getAttribute("cy"));
  let cx = Math.round(100 * (refCx + groupX)) / 100;
  let cy = Math.round(100 * (refCy + groupY)) / 100;
  this.option.coordinate.cx = cx;
  this.option.coordinate.cy = cy;
  this.config.nodePosition.cx = cx;
  this.config.nodePosition.cy = cy;
  this.children[0].updateNodePosition();
};

Site.prototype.adjustTextPosition = function () {
  var new_y;
  var contentBox = SVG(this.config.contentNode).bbox();
  switch (this.option.text.position) {
    case "top":
      new_y = contentBox.cy - contentBox.height * 0.5 - 10;
      this.children[1].config.textNode.setAttribute("y", new_y);
      break;
    case "bottom":
      new_y = contentBox.cy + contentBox.height * 0.5 + 20;
      this.children[1].config.textNode.setAttribute("y", new_y);
      break;
    default:
      break;
  }
};

Site.prototype.update = function (siteOption) {
  let previousOptionJson = JSON.stringify(this.option);
  this.children = [];
  let { option, config } = this.standarizeOptionAndConfig(siteOption, false);
  this.option = option;
  this.config = config;
  let updateNode = this.createNodes();
  this.parent.nodes.replaceChild(updateNode, this.nodes);
  this.nodes = updateNode;
  if (this.parent.config.editable) {
    this.children[0].updateTransform(this.option.style.rotate);
    this.children[0].children[8].updateCloneNode();
    this.draggable();
  }
  this.parent.parent.config.isUndo = false;
  let operation = {
    target: this,
    cmd: "update",
    args: previousOptionJson,
    nodesIndex: this.nodesIndex,
  };
  this.parent.parent.config.undoStack.push(operation);
  return this;
};

Site.prototype.delete = function () {
  IbsUtils.deleteObj(this);
  this.parent.parent.config.isUndo = false;
  let operation = {
    target: this,
    cmd: "delete",
    args: JSON.stringify(this.option),
    nodesIndex: this.nodesIndex,
  };
  this.parent.parent.config.undoStack.push(operation);
  return true;
};

export { Site };