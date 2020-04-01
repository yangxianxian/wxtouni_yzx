# 微信小程序转换为uni-app项目   
   
输入小程序项目路径，输出uni-app项目。
 
        
## 安装   
   
```js
$ npm install wxtouni -g
```
   
## 升级版本   
   
```js
$ npm update wxtouni -g
```
   
## 使用方法

```sh
1、安装完成后再根目录下新建wxTOuni文件
2、把需要转换的微信小程序代码复制到wxTOuni文件夹中
3、在根目录下执行wxtouni命令开始转换

```


## 使用注意事项
```sh
1、除组件components和page,以及根目录的app.js和app.json、app.wxss这些以外的文件都自动屏蔽不做转换
2、转换后并不能直接运行，需要手动更改一些特殊写法
3、项目不需要转换的文件都必须放在utils文件夹中，不然就会被转义，例如请求封装等js
```

## 文件转换

```sh
1、将微信小程序原生的js\json\wxml\wxss 四个文件合并转换成uni格式的vue文件，自动添加了uni需要的格式
2、把wxml文件中的一些微信小程序的写法改为vue的写法
3、生命周期的改变
4、组件写法的改变
等等。。。
```

## 实现思路
```sh
0、利用node的fs文件系统以及path对文件递归循环出每一个文件，保证每一个文件都可以操作到
1、使用babel工具转换AST抽象语法树并在此树中添加和修改代码，最后再转换为浏览器可识别的js代码
2、htmlparser2用这个工具转换wxml文件，并再抽象出的树中做增删改查的操作
```

## 待完善
```sh
1、自动生成uniapp项目脚手架
2、对微信小程序的wxs事件转换
```