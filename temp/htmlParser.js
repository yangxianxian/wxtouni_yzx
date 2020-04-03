const htmlparser =require('htmlparser2')
//html标签替换规则，可以添加更多
function repairAttr (attr) {
    return attr.replace(/{{ ?(.*?) ?}}/, '$1').replace(/\"/g, "'");
}
function turnWxfor(attr,attrArr) {//转换wx:for
    let itemK = 'item'
    let indexK = 'index'
    Object.keys(attrArr).map(k => {
        if(k == 'wx:for-item') {
            itemK = attrArr[k]
        } else if(k == 'wx:for-index') {
            indexK = attrArr[k]
        }
    })
    let result = `"(${itemK},${indexK}) in ${repairAttr(attr)}" :key="${indexK}"`
    return result
}


const attrConverterConfigUni = {
    'style':{
        key:':style',
        value:str => {//转换动态绑定的style
            let resultAttr = str.replace(/{{ ?(.*?) ?}}(px)?/g, "${ $1 }$2");
            return '`'+resultAttr+'`'
        }
    },
    'wx:for': {
        key: 'v-for',
        value: (str,attrArr) => {
            return turnWxfor(str,attrArr);
        }
    },
    'wx:if': {
        key: 'v-if',
        value: str => {
            return repairAttr(str);
        }
    },
    'wx-if': {
        key: 'v-if',
        value: str => {
            return repairAttr(str);
        }
    },
    'wx:else': {
        key: 'v-else',
        value: str => {
            console.log(55555555555555)
            return repairAttr(str);
        }
    },
    'wx:elif': {
        key: 'v-else-if',
        value: str => {
            return repairAttr(str);
        }
    },
    'hidden': {
        key: 'v-show',
        value: str => {//hidden转换为v-show时，值要取反
            str = str.replace(/{{ ?(.*?) ?}}/, '$1').replace(/\"/g, "").toString();
            return str.indexOf('!') != -1 ? str.replace(/\!/g, "") : `!${str}`
        }
    },
    scrollX: {
        key: 'scroll-x',
        value: str => {
            return repairAttr(str);
        }
    },
    scrollY: {
        key: 'scroll-y',
        value: str => {
            return repairAttr(str);
        }
    },
    bindtap: {
        key: '@tap',
        value: str => {
            return repairAttr(str);
        }
    },
    'capture-bind:tap': {
        key: '@tap',
        value: str => {
            return repairAttr(str);
        }
    },
    'bind:tap': {
        key: '@tap',
        value: str => {
            return repairAttr(str);
        }
    },
    'bind:touchstart': {
        key: '@touchstart',
        value: str => {
            return repairAttr(str);
        }
    },
    'bind:touchmove': {
        key: '@touchmove',
        value: str => {
            return repairAttr(str);
        }
    },
    'catch:touchmove': {
        key: '@touchmove',
        value: str => {
            return repairAttr(str);
        }
    },
    'change:prop': {
        key: 'change:prop',
        value: str => {
            return repairAttr(str);
        }
    },
    'bind:touchend': {
        key: '@touchend',
        value: str => {
            return repairAttr(str);
        }
    },
    bindtouchstart:{
        key: '@touchstart',
        value: str => {
            return repairAttr(str);
        }
    },
    bindinput: {
        key: '@input',
        value: str => {
            return str
        }
    },
    bindgetuserinfo: {
        key: '@getuserinfo',
        value: str => {
            return str
        }
    },
    catchtap: {
        key: '@tap.stop',
        value: str => {
            return repairAttr(str);
        }
    },
    'capture-catch:tap': {
        key: '@tap.stop',
        value: str => {
            return repairAttr(str);
        }
    },
    'catch:tap': {
        key: '@tap.stop',
        value: str => {
            return repairAttr(str);
        }
    }
};
class TemplateParser{
    constructor() {
        
    }
    astToString(wxmlAST) {
        let str = '';
        wxmlAST.forEach(item => {
            if (item.type === 'text') {
                str += item.data;
            } else if (item.type === 'tag') {
                if(item.name.indexOf('_') != -1) {
                    let splitName = item.name.split('_')
                    if(splitName && splitName.length) {
                        for(let i in splitName) {
                            if(i != 0) {
                                splitName[i] = splitName[i].charAt(0).toUpperCase() + splitName[i].slice(1)
                            }
                        }
                    }
                    item.name = splitName.join('')
                }
                if(item.name == 'wxs') {
                    return
                }
                str += '<' + item.name;
                if (item.attribs) {
                    Object.keys(item.attribs).forEach(attr => {
                        let val = item.attribs[attr];
                        if(attr == 'wx:key' || attr.indexOf('wx:for-') != -1) {
                            return
                        }
                        if(attr.indexOf('data-') != -1) {
                            return
                        }
                        if(attr == "data") {
                            return
                        }
                        let attrObj = attrConverterConfigUni[attr]
                        if (val == "") {//wx:else
                            if(attrObj) {
                                str += ` ${attrObj.key}`;
                            }else {
                                str += ` ${attr}`;
                            }
                        } else {
                            if(attr == 'wx:for') {
                                str += ` ${attrObj.key}=${attrObj.value(val,item.attribs)}`;
                            }else {
                                if(attrObj) {
                                    if(attrObj.key.indexOf('@') != -1) {
                                        let clickMethordOrg = []
                                        let isContainProp = false//判断当前方法事件是否是wxs事件
                                        Object.keys(item.attribs).filter(kres => {
                                            let kresVal = item.attribs[kres]
                                            if(kres == 'change:prop') {
                                                isContainProp = true
                                                if(kres.indexOf('data-') != -1) {
                                                    str += ` ${kres}="${kresVal}"`;
                                                }
                                            }
                                            if(kres.indexOf('data-') != -1) {
                                                let keySlice = kres.slice(5)
                                                let strPattern = /{{ ?(.*?) ?}}/g
                                                let rRV = strPattern.test(kresVal) ? kresVal.replace(/{{ ?(.*?) ?}}/g, "$1") : `'${kresVal}'`
                                                clickMethordOrg.push(`${keySlice}:${rRV}`)
                                            }
                                        })
                                        if(!isContainProp && clickMethordOrg.length) {
                                            str += ` ${attrObj.key}="${attrObj.value(val)}({${clickMethordOrg.join(',')}})"`;
                                        }else {
                                            str += ` ${attrObj.key}="${attrObj.value(val)}"`;
                                        }
                                    }else {
                                        str += ` ${attrObj.key}="${attrObj.value(val)}"`;
                                    }
                                }else {
                                    if(attr == 'src') {
                                        val = val.replace(/assets/g,'static')
                                    }
                                    let strPattern = /{{ ?(.*?) ?}}/g
                                    if(strPattern.test(val)) {
                                        //除了attrConverterConfigUni中匹配的修改规则外去除没有匹配到的属性的双括号
                                        if(attr == 'class' || attr == 'src' || (val.match(strPattern) && val.match(strPattern).length > 1)) {
                                            let resultAttr = val.replace(/{{ ?(.*?) ?}}/g, "${ $1 }")
                                            str += ` :${attr}` + '="`' + `${resultAttr}` + '`"';
                                        }else {
                                            let resultAttr = val.replace(/{{ ?(.*?) ?}}/g, "$1")
                                            str += ` :${attr}="${resultAttr}"`;
                                        }
                                    }else {
                                        if(attr.indexOf('bind:') != -1) {
                                            attr = attr.replace(/bind:/g,'')
                                            str += ` @${attr}="${val}"`;
                                        }else {
                                            str += ` ${attr}="${val}"`;
                                        }
                                    }
                                }
                            }
                        }
                        
                    });
                }
                str += '>';
                if (item.children && item.children.length) {
                    str += this.astToString(item.children);
                }
                str += `</${item.name}>`;
            } else if (item.type == "comment") {
                str += `<!--${item.data}-->`;
            }
        });
        return str
    }

    async parseHtml(source) {//写入文件到js文件中
        let wxmlAST = await this.buildHtmlAST(source)
        if(wxmlAST && wxmlAST.length) {
            return this.astToString(wxmlAST)
        }
    }
    buildHtmlAST(souces) {
        return new Promise((resolve, reject) => {
            //先初始化一个domHandler
            const handler = new htmlparser.DomHandler((error, dom) => {
                if (error) {
                    console.log("parse wxml error: " + error);
                    resolve(false);
                } else {
                    //在回调里拿到AST对象  
                    resolve(dom);
                }
            });
            //再初始化一个解析器
            const parser = new htmlparser.Parser(handler, {
                xmlMode: true,
                //将所有标签小写，并不需要，设置为false, 如果xmlMode禁用，则默认为true。所以xmlMode为true。
                lowerCaseTags: false,
                //自动识别关闭标签，并关闭，如<image /> ==> <image></image>,不加的话，会解析异常，导致关闭标签会出现在最后面
                recognizeSelfClosing: true,
            });
            //再通过write方法进行解析
            parser.write(souces.toString());
            parser.end();
        });
    }

}
module.exports = TemplateParser