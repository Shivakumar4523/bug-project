import type { FilterQuery, Model, UpdateQuery } from "mongoose";

export class BaseRepository<T> {
  constructor(private model: Model<T>) {}

  findAll(filter: FilterQuery<T> = {}, populate?: string | string[]) {
    let query = this.model.find(filter).sort({ updatedAt: -1 });
    if (populate) {
      query = query.populate(populate);
    }
    return query;
  }

  findById(id: string, populate?: string | string[]) {
    let query = this.model.findById(id);
    if (populate) {
      query = query.populate(populate);
    }
    return query;
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
