exports.up = (pgm) => {
  pgm.createSequence("asset_tag_sequence", {
    start: 1,
    increment: 1,
  });
};

exports.down = (pgm) => {
  pgm.dropSequence("asset_tag_sequence");
};
