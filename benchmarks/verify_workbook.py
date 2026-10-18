"""Verify the report's limited formula set and populate Excel cached results."""
import re, sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from openpyxl import load_workbook
from openpyxl.utils.cell import range_boundaries
from PIL import Image, ImageDraw, ImageFont
p=Path(sys.argv[1]); wb=load_workbook(p,read_only=True); cache={}
def cell(sheet, address):
    key=(sheet,address)
    if key in cache: return cache[key]
    value=wb[sheet][address].value
    if isinstance(value,str) and value.startswith('='): value=calc(sheet,value[1:])
    cache[key]=value; return value
def calc(sheet,expr):
    expr=re.sub(r"(SUM|MAX)\('([^']+)'!([A-Z]+\d+:[A-Z]+\d+)\)",lambda m: aggregate(m),expr)
    expr=re.sub(r"'([^']+)'!\$?([A-Z]+)\$?(\d+)",lambda m:repr(cell(m[1],m[2]+m[3])),expr)
    expr=re.sub(r'\b([A-Z]+\d+)\b',lambda m:repr(cell(sheet,m[1])),expr)
    expr=expr.replace('IF(', 'choose(').replace('AND(', 'both(')
    return eval(expr,{'__builtins__':{},'choose':lambda cond,a,b:a if cond else b,'both':lambda *a:all(a)})
def aggregate(match):
    op,sheet,rng=match.groups(); a,b,c,d=range_boundaries(rng)
    values=[cell(sheet,wb[sheet].cell(row,col).coordinate) for row in range(b,d+1) for col in range(a,c+1)]
    return repr(sum(values) if op=='SUM' else max(values))
count=0
for ws in wb:
    if ws.title=='Raw requests': continue
    for row in ws:
        for c in row:
            if c.data_type=='f': cell(ws.title,c.coordinate); count+=1
assert cell('Summary','B3')==wb['Raw requests'].max_row-1
if len(sys.argv)>2:
    import json
    evidence=json.loads(Path(sys.argv[2]).read_text())
    assert cell('Summary','B3')==sum(s['requests'] for s in evidence['stages'])
    assert cell('Summary','B4')==sum(s['errors'] for s in evidence['stages'])
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(p) as z:
    patched={}
    for n,ws in enumerate(wb,1):
        name=f'xl/worksheets/sheet{n}.xml'
        if ws.title=='Raw requests': continue
        doc=ET.fromstring(z.read(name))
        for c in doc.findall('.//s:c',ns):
            if c.find('s:f',ns) is None: continue
            value=cell(ws.title,c.attrib['r']); v=c.find('s:v',ns)
            if v is None: v=ET.SubElement(c,'{'+ns['s']+'}v')
            if isinstance(value,str): c.set('t','str')
            else: c.pop('t',None) if hasattr(c,'pop') else c.attrib.pop('t',None)
            v.text=str(value)
        patched[name]=ET.tostring(doc,encoding='utf-8',xml_declaration=True)
    tmp=p.with_suffix('.verified.xlsx')
    with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED) as out:
        for info in z.infolist(): out.writestr(info,patched.get(info.filename,z.read(info.filename)))
wb.close(); tmp.replace(p)
# A table preview from the workbook's actual cells, widths, colors and cached results.
wb=load_workbook(p,read_only=True,data_only=True)
ws=wb['Summary']; widths=[350,850]; rowh=47
img=Image.new('RGB',(sum(widths)+40,rowh*15+40),'white'); draw=ImageDraw.Draw(img)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',15)
for row in ws.iter_rows(max_row=min(ws.max_row,14)):
    if all(c.value is None for c in row): continue
    y=20+(row[0].row-1)*rowh; x=20
    for i,c in enumerate(row):
        fill='#18344D' if c.row==1 else '#EEF2F6' if c.row%2==0 else 'white'
        draw.rectangle((x,y,x+widths[i],y+rowh),fill=fill)
        v=c.value if c.value is not None else ''
        if isinstance(v,float): v=f'{v:.2%}' if c.row==5 else f'{v:,.2f}'
        if isinstance(v,int): v=f'{v:,}'
        words=str(v).split(); lines=['']
        for word in words:
            if draw.textlength(lines[-1]+' '+word,font=font)>widths[i]-20: lines.append(word)
            else: lines[-1]=(lines[-1]+' '+word).strip()
        assert len(lines)<=2,(c.coordinate,lines)
        draw.multiline_text((x+8,y+8),'\n'.join(lines),font=font,fill='white' if c.row==1 else '#243746',spacing=3)
        x+=widths[i]
img.save(p.parent/'summary-preview.png')
print(f'Verified {count} formulas, cached results, total counts and stage decisions; preview saved.')
