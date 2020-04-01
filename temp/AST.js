
const path = require('path')
const fs = require('fs')


const JavascriptParser = require('./jsParser')
//初始化一个解析器
const javascriptParser = new JavascriptParser();



const readDir = (entry) => {
	const dirInfo = fs.readdirSync(entry);
	dirInfo.forEach(item=>{
		const location = path.join(entry,item);
		const info = fs.statSync(location);
		if(info.isDirectory()){
			if(item == 'assets') {
				return
			}
			if(item == 'utils') {
				return
			}
			if(item == 'node_modules') {
				return
			}
			console.log(location)
			readDir(location);
		}else{
			//当dirInfo.length == 1时表示文件已经被转换过，已经删掉了除Vue以外的所有文件
			if(dirInfo.length == 1) return
			let suffixName = path.extname(location)
			if(suffixName == '.js') {
				fs.readFile(location, function(err,data) {
					if(err) {
						return err;
					}
					console.log(location)
					javascriptParser.buildScript(data,location)
				});
			}
			
		}
	})
}

readDir(path.join(process.cwd(),'wxTOuni'));






function fsExistsSync(path) {
    try{
        fs.accessSync(path,fs.F_OK);
    }catch(e){
        return false;
    }
    return true;
}