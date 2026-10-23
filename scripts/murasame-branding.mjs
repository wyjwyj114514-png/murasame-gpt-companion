import fs from 'node:fs';
import path from 'node:path';

// Keep upstream identifiers, routes and attribution intact; change local UI copy.
export function brandText(text) {
  return text.replaceAll('API 余额小鲸鱼','小丛雨').replaceAll('小鲸鱼','小丛雨').replaceAll('鲸鱼娘','小丛雨').replaceAll('鲸鱼','丛雨').replaceAll('🐳','🌸').replaceAll('🐋','🌸');
}

export function brandBuild(root, character) {
  function walk(dir) {
    for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
      const file=path.join(dir,item.name);
      if(item.isDirectory())walk(file);
      else if(/\.(?:js|mjs|cjs|html|json|yml)$/.test(item.name)) {
        const original=fs.readFileSync(file,'utf8');let text=brandText(original);
        if(character)text=text.replace(/file: '(?:bubble-petpet|bubble-money1|bubble-yue-money)\.gif', format: 'gif'/g,"file: 'DSniang1.png', format: 'png'")
          .replaceAll("path.join(PACKAGE_ROOT, 'assets', 'rua.gif')","path.join(PACKAGE_ROOT, 'assets', 'DSniang1.png')")
          .replace(/(const bytes = loadGif\(\)[\s\S]{0,90}'Content-Type': )'image\/gif'/g,"$1'image/png'");
        if(text!==original)fs.writeFileSync(file,text);
      }
    }
  }
  for(const name of ['assets','desktop','lib','runtime','dsh'])if(fs.existsSync(path.join(root,name)))walk(path.join(root,name));
  const pkg=path.join(root,'package.json');if(fs.existsSync(pkg))fs.writeFileSync(pkg,brandText(fs.readFileSync(pkg,'utf8')));
  if(character) {
    for(const name of ['assets/DSniang1.png','assets/DSniang02.png','icon.png'])if(fs.existsSync(path.join(root,name)))fs.copyFileSync(character,path.join(root,name));
    const fallback=path.join(root,'desktop/ui/input.js');
    if(fs.existsSync(fallback)) {
      const text=fs.readFileSync(fallback,'utf8');
      const begin=text.indexOf("      const canvas = document.createElement('canvas'); canvas.width = 160;"),end=text.indexOf('\n      if (!ready)',begin);
      if(begin<0||end<begin)throw Error('Emergency character fallback hook changed');
      fs.writeFileSync(fallback,text.slice(0,begin)+"      pet.src = 'data:image/png;base64,"+fs.readFileSync(character).toString('base64')+"'; pet.alt = '小丛雨恢复图';"+text.slice(end));
    }
  }
}
