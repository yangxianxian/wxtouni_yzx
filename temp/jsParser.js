const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const t =require('@babel/types')
const core = require('@babel/core')
const path = require('path')
const fs = require('fs')

const TemplateParser = require('./htmlParser')
const templateParser = new TemplateParser();

function paseCss(location) {
    let lastDir = path.resolve(location,'..')
    // let basename = path.basename(lastDir) 
    // let wxssFilePath = path.join(lastDir,basename+'.wxss')
    let wxssFilePath = getdirFiles(lastDir,'.wxss')
    
    try {
        console.log(wxssFilePath)
        let wxssDatas = fs.readFileSync(wxssFilePath)
        let str = '<style>\n'+wxssDatas +'\n</style>'
        if(wxssFilePath) fs.unlinkSync(wxssFilePath)
        return str
    } catch (error) {
        return null
    }
}
function getdirFiles(location,type) {
    //获取当前文件夹下面的文件
    // let lastDir = path.resolve(location,'..')
    const dirInfo = fs.readdirSync(location);
    if(dirInfo && dirInfo.length) {
        let result = ''
        dirInfo.forEach(name => {
            const location_name = path.join(location,name);
            const info = fs.statSync(location_name);
            if(!info.isDirectory()) {
                let suffixName = path.extname(location_name)
                if(suffixName == type && name != 'project.config.json' && name != 'sitemap.json') {
                    result = location_name
                }
            }
        })
        return result
    }
}
function parseWxml(location) {
    return new Promise((resolve,reject) => {
        let lastDir = path.resolve(location,'..')
        // let basename = path.basename(lastDir) 
        let wxmlFilePath = getdirFiles(lastDir,'.wxml')
        if(wxmlFilePath) {
            console.log(wxmlFilePath)
            // let wxmlFilePath = path.join(lastDir,basename+'.wxml')
            let wxmldData = fs.readFileSync(wxmlFilePath);
            let wxmlStr = templateParser.parseHtml(wxmldData)
            if(wxmlFilePath) fs.unlinkSync(wxmlFilePath)
            resolve(wxmlStr)
        }else {
            resolve('')
        }
        
    })
}

function parseJson(location) {
    //json解析转换
    //把json中引用的组件处理到页面中以vue的形式展现
    let lastDir = path.resolve(location,'..')
    let basename = path.basename(lastDir) 
    if(basename == 'dist') basename = 'app'
    let vueFilePath = path.join(lastDir,basename+'.vue')
    // let jsonFilePath = path.join(lastDir,basename+'.json')
    let jsonFilePath = getdirFiles(lastDir,'.json')
    let importStrArr = ''
    let componentAst = ''
    if(jsonFilePath) {
        console.log(jsonFilePath)
        let parseSouces = JSON.parse(fs.readFileSync(jsonFilePath).toString())
        if(parseSouces && parseSouces.usingComponents) {
            let componentObj = parseSouces.usingComponents
            let componentObjArr = Object.keys(componentObj)
            if(componentObjArr.length) {
                let componentKeyArr = []
                
                for(let key of componentObjArr) {
                    
                    let importKey = key.replace(/-/g,'')
                    if(key.indexOf('_') != -1) {
                        let splitName = key.split('_')
                        if(splitName && splitName.length) {
                            for(let i in splitName) {
                                if(i != 0) {
                                    splitName[i] = splitName[i].charAt(0).toUpperCase() + splitName[i].slice(1)
                                }
                            }
                        }
                        importKey = splitName.join('')
                    }
                    
                    importStrArr += 'import '+ importKey + ' from ' +'"'+componentObj[key]+'"' + '\n'
                    componentKeyArr.push(t.Identifier(importKey))
                }
                componentAst = t.LabeledStatement(
                    t.Identifier('components'),
                    t.blockStatement([
                        t.ExpressionStatement(
                            t.SequenceExpression(componentKeyArr)
                        )
                    ])
                )
            }
        }
    }
    
    if(jsonFilePath) fs.unlinkSync(jsonFilePath)
    
    return {
        vueFilePath:vueFilePath,
        componentImport:importStrArr,
        componentAst:componentAst
    }
}
class JavascriptParser {
    constructor() {

    }

    async buildScript (souces,location) {
            //js解析转换
            let wxssData = paseCss(location)
            let jsonData = parseJson(location)
            let wxmlData = await parseWxml(location)
            let wxmlResult = wxmlData ? '<template>\n<view>\n' + wxmlData + '\n</view>\n</template>' : ''
            
            let ASTtree = this.astParseEvent(souces.toString()) //解析出AST树
            traverse(ASTtree,{
                ExpressionStatement:function(path) {//添加export default{}包裹层
                    let expressions = path.node.expression
                    if(!expressions || !expressions.callee) return
                    if(expressions.callee.name == 'Component' || expressions.callee.name == 'Page') {
                        if(expressions.arguments[0]) {
                            let argumentPro = expressions.arguments[0].properties
                            if(argumentPro.length) {
                                //去掉js中的pageLifetimes，并把其中的方法和事情放出来
                                argumentPro.map(item => {
                                    const name = item.key.name
                                    if(name == 'pageLifetimes' && item.value.properties && item.value.properties.length) {
                                        expressions.arguments[0].properties = argumentPro.concat(item.value.properties)
                                    }
                                })
                            }
                        }
                        path.replaceWith(
                            t.exportDefaultDeclaration(expressions.arguments[0])
                        )
                        return
                    }
                    if(expressions.callee.property && expressions.callee.property.name == 'triggerEvent') {
                        //更改子组件向父组件转递值的方式
                        //因为父组件再取值的时候是data.detail。所以再包裹一层detail
                        path.node.expression.callee.property.name = '$emit'
                        if(path.node.expression.arguments.length > 1 && path.node.expression.arguments[1].properties.length) {
                            let detailAst = t.objectExpression([
                                t.ObjectProperty(
                                    t.Identifier('detail'),
                                    path.node.expression.arguments[1]
                                )
                            ])
                            path.node.expression.arguments[1] = detailAst
                        }
                        path.replaceWith(path.node)
                    }
                },
                Property:function(path) {
                    if(!path.node.value) return
                    const name = path.node.key.name
                    const value = path.node.value
                    //删除空节点
                    if (value.properties && value.properties.length == 0){
                        path.remove();
                        return
                    }
                    if(value.type == 'FunctionExpression' && !value.body.body.length) {
                        path.remove();
                        return
                    }
                    if(name == 'data') {//data{} 改为data(){return{}}格式
                        let dataFuc = t.objectMethod(
                            'method',
                            t.Identifier("data"),
                            [],
                            t.BlockStatement([
                                t.ReturnStatement(value)
                            ])
                        )
                        if(jsonData.componentAst) {
                            path.replaceWithMultiple([
                                jsonData.componentAst,
                                dataFuc
                            ])
                        }else {
                            path.replaceWith(dataFuc)
                        }
                        
                    }else if(name == 'pageLifetimes') {//删除pageLifetimes节点
                        path.remove();
                    }else if(name == 'properties') {//更改子组件接受父组件传递的值的方式
                        path.node.key.name = 'props'
                        value.properties.forEach(item => {
                            if(item.value.properties.length == 2) {
                                item.value.properties[1].key.name = 'default'
                            }
                        })
                        path.replaceWith(path.node)
                    }
                },
                Identifier:function(path) {//把组件生命周期的名字改为vue允许的生命周期关键词
                    if(!path.node.name) return
                    const name = path.node.name
                    // const type = path.parent.type
                    if(name == 'attached') {
                        path.replaceWith(t.Identifier("created"))
                    }else if(name == 'ready') {
                        path.replaceWith(t.Identifier("mounted"))
                    }else if(name == 'hide') {
                        path.replaceWith(t.Identifier("beforeDestroy"))
                    }else if(name == 'observers') {
                        path.replaceWith(t.Identifier("watch"))
                    }else if(name == 'wx') {
                        path.replaceWith(t.Identifier("uni"))
                    }
                },
                MemberExpression:function(path) {//把this.data改为this
                    let names = path.node.object.type =='ThisExpression' ? 'this' : path.node.object.name
                    if((names == 'this' || names == '_this' || names =='that') && path.node.property.name == 'data') {
                        path.replaceWith(t.Identifier(names))
                    }

                },
                CallExpression:function(path) {
                    //重写setData
                    const nodeCallee = path.node
                    if(nodeCallee.callee && nodeCallee.callee.object && nodeCallee.callee.property) {
                        if(nodeCallee.callee.property.name == 'setData') {
                            let nodeArguments = nodeCallee.arguments
                            if(nodeArguments && nodeArguments.length && nodeArguments[0].properties && nodeArguments[0].properties.length) {
                                let setDataArr = []
                                let thisStr = nodeCallee.callee.object.type == 'ThisExpression' ? 'this' : nodeCallee.callee.object.name
                                nodeArguments[0].properties.map(item => {
                                    if(item.key && item.key.name) {
                                        let setAst = t.ExpressionStatement(
                                            t.assignmentExpression(
                                                '=',
                                                t.Identifier(thisStr +'.'+ item.key.name),
                                                item.value
                                            )
                                        )
                                        setDataArr.push(setAst)
                                    }
                                })
                                path.replaceWithMultiple(
                                    setDataArr
                                )
                            }else {
                                path.remove();
                            }
                        }
                    }
                }
            })
            // return
            if(location) fs.unlinkSync(location)
            core.transformFromAstAsync(ASTtree).then(res => {
                let scriptStr = wxmlResult + '\n<script>\n'+ jsonData.componentImport + res.code+'\n</script>\n'+wxssData
                fs.writeFile(jsonData.vueFilePath,scriptStr,function(err){
                    if(err) {
                        return err;
                    }
                    console.log('success_js')
                })
            })
        
    }
    fsExistsSync(path) {
        try{
            fs.accessSync(path,fs.F_OK);
        }catch(e){
            return false;
        }
        return true;
    }
    
    
    astParseEvent(astSouces) {
        let ASTtree = parser.parse(astSouces,{
            sourceType: 'module',
            // Note that even when this option is enabled, @babel/parser could throw for unrecoverable errors.
            // errorRecovery: true,  //没啥用，碰到let和var对同一变量进行声明时，当场报错！还会中断转换进程
            plugins: [
                "asyncGenerators",
                "classProperties",
                "decorators-legacy", //"decorators", 
                "doExpressions",
                "dynamicImport",
                "exportExtensions",
                "flow",
                "functionBind",
                "functionSent",
                "jsx",
                "objectRestSpread",
            ]
        })
        return ASTtree;
    }
}


module.exports = JavascriptParser