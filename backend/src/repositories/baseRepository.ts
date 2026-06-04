import type { FilterQuery, Model, UpdateQuery } from "mongoose";

export class BaseRepository<T> {
  constructor(private model: Model<T>) {}

  findAll(filter: FilterQuery<T> = {}) {
    return this.model.find(filter).sort({ updatedAt: -1 });
  }

  findById(id: string) {
    return this.model.findById(id);
  }

  create(data: Partial<T>) {
    return this.model.create(data);
  }

  update(id: string, data: UpdateQuery<T>) {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  delete(id: string) {
    return this.model.findByIdAndDelete(id);
  }
}
