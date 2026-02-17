"use client";

interface Props {
  category: string;
  sort: string;
  categories: string[];
  onChange: (category: string, sort: string) => void;
}

export default function FilterBar({ category, sort, categories, onChange }: Props) {
  return (
    <div className="filter-bar">
      <div className="filter-field">
        <label className="filter-label">Category</label>
        <select
          value={category}
          onChange={(e) => onChange(e.target.value, sort)}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label className="filter-label">Sort</label>
        <select
          value={sort}
          onChange={(e) => onChange(category, e.target.value)}
          className="filter-select"
        >
          <option value="created_desc">Added (newest first)</option>
          <option value="date_desc">Date (newest first)</option>
        </select>
      </div>
    </div>
  );
}
