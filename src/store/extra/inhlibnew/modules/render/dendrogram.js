export function updateDendrogramLineWidth(size) {
  const self = this;

  self.settings.dendrogram_line_width = size;

  var rows = self.dendrogram_layer.getChildren();
  rows.forEach((row) => {
    const rowChildren = row.getChildren();
    rowChildren.forEach((line) => {
      if (line.attrs.strokeWidth !== undefined) {
        line.setAttr("strokeWidth", size);
      }
    });
  });

  rows = self.column_dendrogram_layer.getChildren();
  rows.forEach((row) => {
    const rowChildren = row.getChildren();
    rowChildren.forEach((line) => {
      if (line.attrs.strokeWidth !== undefined) {
        line.setAttr("strokeWidth", size);
      }
    });
  });

  self.dendrogram_layer.draw();
  self.column_dendrogram_layer.draw();
}

export function setColumnDendrogramVisibility(visibility) {
  const self = this;
  if (typeof visibility !== "boolean" || self.column_dendrogram_layer === undefined) {
    console.error("Visibility must be a boolean value.");
    return;
  }
  if (visibility) {
    self.column_dendrogram_layer.show();
  } else {
    self.column_dendrogram_layer.hide();
  }
  self.column_dendrogram_layer.draw();
}

export function setDendrogramVisibility(visibility) {
  if (typeof visibility !== "boolean") {
    console.error("Visibility must be a boolean value.");
    return;
  }
  const self = this;
  self.settings.dendrogram = visibility;
  if (visibility) {
    self.dendrogram_layer.show();
  } else {
    self.dendrogram_layer.hide();
  }
  self.dendrogram_layer.draw();
}

