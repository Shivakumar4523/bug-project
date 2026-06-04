export class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    findAll(filter = {}) {
        return this.model.find(filter).sort({ updatedAt: -1 });
    }
    findById(id) {
        return this.model.findById(id);
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
