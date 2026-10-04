class CreateSearchCursors < ActiveRecord::Migration[8.0]
  def change
    create_table :search_cursors do |t|
      t.string :query, null: false
      t.string :location, null: false
      t.text :next_page_token

      t.timestamps
    end

    add_index :search_cursors, [ :query, :location ], unique: true
  end
end
