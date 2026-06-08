export class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    findAll(filter = {}, populate) {
        let query = this.model.find(filter).sort({ updatedAt: -1 });
        if (populate) {
            query = query.populate(populate);
        }
        return query;
    }
    findById(id, populate) {
        let query = this.model.findById(id);
        if (populate) {
            query = query.populate(populate);
        }
        return query;
    }
    create(data) {
        return this.model.create(data);
    }
    update(id, data) {
        return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }
    delete(id) {
        return this.model.findByIdAndDelete(id);
    }
}
