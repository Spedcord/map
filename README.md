# map

ETS2 map viewer used by Spedcord

## Query parameters

**line**:\
Draws a line between the specified nodes\
`line=-100,4556.22;55,878;-45223.6,-1223,322`

**line_city**:\
Draws a line between two overlays\
`line_city=COLOR;FROM_CITY,FROM_OVERLAY;TO_CITY,TO_OVERLAY`\
`line_city=Red;Berlin,service_ico;Magdeburg,gas_ico`

**force_zoom**:\
Locks the zoom into the specified value
`force_zoom=8`

**goto**:\
Go to the specified coordinates\
`goto=X;Y;ZOOM` (Zoom is optional)
`goto=-4533567;5656;6`

**goto_city**:\
Go to the specified city\
`goto=CITY;ZOOM` (Zoom is optional)
`goto=Berlin;6`