InCHlib 1.3.0 modularization notes

- The monolithic `inchlib-1.3.0.js` is being gradually split into focused modules under `modules/`.
- First step moves data-loading and normalization helpers to `modules/data.js`.
- The main file wires these back onto `InCHlib.prototype` to keep the public API unchanged.

Current modules

- `modules/data.js`: `_validate_data`, `read_data`, `read_data_from_file`, `_add_prefix`, `_add_prefix_to_data`, `_get_root_id`, `_get_dimensions`.
- `modules/colors.js`: `_precompute_color_palette`, `_calculate_color_at_position`, `_get_color_for_value`.
- `modules/utils.js`: `_monitor_performance`, `_get_font_size`, `_hack_size`, `_hack_round`, `_is_number`, `_get_hash_object`, `_get_max_length`, `_get_max_value_length`.
- `modules/render/heatmap.js`: `_set_on_features`, `_draw_heatmap`, `_draw_heatmap_row`, `_bind_row_events`, `_draw_row_ids`, `_get_row_id_size`, `_draw_heatmap_header`, `_translate_column_to_feature_index`, `redraw_heatmap`, `setRowIdsVisibility`, `setColumnIdsVisibility`, `updateCellColors`, `updateCellColorsPercentile`, `setCellValueVisibility`, `_row_mouseenter`, `_row_mouseleave`, `_draw_col_label`.
- `modules/render/dendrogram.js`: `updateDendrogramLineWidth`, `setColumnDendrogramVisibility`, `setDendrogramVisibility`.

Next candidates (planned)

- `modules/render/dendrogram.js` (full): `_draw_dendrogram_layers`, `_draw_row_dendrogram`, `_draw_row_dendrogram_node`, `_draw_column_dendrogram`, `_draw_column_dendrogram_node`, `_get_nodes2columns`, `_get_x1/_x2/_y1/_y2`, `_draw_vertical_path/_draw_horizontal_path`, highlight/unhighlight helpers, zoom/unzoom, layer event handlers.
- `modules/render/navigation.js`: `_draw_navigation`, `_draw_color_scale`, `_update_color_scale`, color scale select UI, export/help handlers, icon overlays.
- `modules/cleanup.js`: `cleanup`, `cleanupUI`, `destroy` utilities.

Guidelines

- Keep the public API stable; attach module functions to `InCHlib.prototype`.
- Prefer pure helpers when possible and pass instance state explicitly.
- Avoid global state; cache inside the instance (`this`).
