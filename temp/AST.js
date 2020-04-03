
const path = require('path')
const fs = require('fs')


const JavascriptParser = require('./jsParser')
//初始化一个解析器
const javascriptParser = new JavascriptParser();
let rootPath = path.join(process.cwd(),'wxTOuni')


const readDir = (entry) => {
	const dirInfo = fs.readdirSync(entry);
	const wxmlName = dirInfo.filter(res => {
		return path.extname(path.join(entry,res)) == '.wxss'
	})
	
	dirInfo.forEach(item=>{
		const location = path.join(entry,item);
		const info = fs.statSync(location);
		if(info.isDirectory()){
			if(item == 'assets') {//更改文件夹名字assets为static
				fs.renameSync(location,path.join(entry,'static'))
				return
			}
			if(item == '.git' || item == 'utils' || item == 'node_modules') {
				return
			}
			console.log(location)
			readDir(location);
		}else{
			//当dirInfo.length == 1时表示文件已经被转换过，已经删掉了除Vue以外的所有文件
			console.log(item)
			if(item == 'sitemap.json' || item == 'project.config.json') {//删除文件
				fs.unlinkSync(location)
				return
			}
			if(dirInfo.length == 1) return
			let suffixName = path.extname(location)
			if(wxmlName && wxmlName.length) {
				let ns = wxmlName[0].split('.')[0]
				if(suffixName == '.js' && item.split('.')[0] == ns) {
					fs.readFile(location, function(err,data) {
						if(err) {
							return err;
						}
						console.log(location)
						javascriptParser.buildScript(data,location)
					});
				}
			}
		}
	})
}

readDir(rootPath);






function fsExistsSync(path) {
    try{
        fs.accessSync(path,fs.F_OK);
    }catch(e){
        return false;
    }
    return true;
}