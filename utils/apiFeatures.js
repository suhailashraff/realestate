class apiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((el) => {
      delete queryObj[el];
    });
    this.query = this.query.find(queryObj);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      this.query = this.query.sort(this.queryString.sort);
    } else {
      this.query.sort("price");
    }
    return this;
  }

  search() {
    if (this.queryString.search) {
      const regex = new RegExp(this.queryString.search, "i");
      this.query = this.query.find({
        $or: [{ title: { $regex: regex } }, { location: { $regex: regex } }],
      });
    }
    return this;
  }
}

module.exports = apiFeatures;
