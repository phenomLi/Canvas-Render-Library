import { Group } from '../shape/Group';
import { ShapeType } from '../render/core';
import { Composite } from '../shape/Composite';
import { Shape } from '../shape/BaseShape';
import { Matrix, RotateMatrix, TranslateMatrix, ResultMatrix, ScaleMatrix } from '../math/matrix';
import { polygonVex } from '../shape/Polygon';
import { Vector } from '../math/vector';



// 集合类图形深度优先搜索
export function DFS(shapeList: Array<ShapeType>, fn: Function, flag: boolean = true) {
    shapeList.map(item => {
        if(item.attr('type') === 'Group' || item.attr('type') === 'Composite') {
            flag && fn(item);
            DFS((<Group | Composite>item).getShapeList(), fn);
        }
        else {
            fn(item);
        }
    }); 
}



// 闭合多边形顶点，使其构成闭合图形 
export function closePolyVex(vex: polygonVex) {
    if(vex[0].toString() !== vex[vex.length - 1].toString()) {
        vex.push(vex[0]);
    }
}



// 进行旋转操作
export function rotate(center: Array<number>, deg: number): DOMMatrix {
    let d = deg/180*Math.PI;

    // matrix.a = Math.cos(d); matrix.c = -1*Math.sin(d);
    // matrix.b = Math.sin(d); matrix.d = Math.cos(d);
    // matrix.e = -center[0]*Math.cos(d) + center[1]*Math.sin(d) + center[0];
    // matrix.f = -center[0]*Math.sin(d) - center[1]*Math.cos(d) + center[1];   

    // return matrix;
    Matrix.init(ResultMatrix);

    Matrix.set(TranslateMatrix, [[1, 0, center[0]], [0, 1, center[1]]]);
    Matrix.set(RotateMatrix, [[Math.cos(d), -1*Math.sin(d), 0], [Math.sin(d), Math.cos(d), 0]]);
    
    Matrix.mul(TranslateMatrix, RotateMatrix, ResultMatrix);
    Matrix.set(TranslateMatrix, [[1, 0, -center[0]], [0, 1, -center[1]]]);

    Matrix.mul(ResultMatrix, TranslateMatrix, ResultMatrix);

    return ResultMatrix;
}



// 进行缩放操作
export function scale(center: Array<number>, scaleArray: number[]): DOMMatrix {
    Matrix.init(ResultMatrix);

    Matrix.set(TranslateMatrix, [[1, 0, center[0]], [0, 1, center[1]]]);
    Matrix.set(ScaleMatrix, [[scaleArray[0], 0, 0], [0, scaleArray[1], 0]]);

    Matrix.mul(TranslateMatrix, ScaleMatrix, ResultMatrix);
    Matrix.set(TranslateMatrix, [[1, 0, -center[0]], [0, 1, -center[1]]]);

    Matrix.mul(ResultMatrix, TranslateMatrix, ResultMatrix);

    return ResultMatrix;
}

// 旋转多边形的顶点
export function rotateVex(vex: polygonVex, center:number[], deg: number): polygonVex {
    let d = deg/180*Math.PI;

    return vex.map(v => [
        (v[0] - center[0])*Math.cos(d) - (v[1] - center[1])*Math.sin(d) + center[0],
        (v[1] - center[1])*Math.cos(d) + (v[0] - center[0])*Math.sin(d) + center[1]
    ]);
}


/**------------------------------------------util-------------------------------------------------- */

// 数组深拷贝
export function arrayDeepCopy<T>(arr): T {
    return arr.map(item => Array.isArray(item)? arrayDeepCopy(item): item);
}


// 判断坐标是否在某个图形内
export function isInShape(ctx: CanvasRenderingContext2D, shape: Shape | Composite, x: number, y: number): boolean {
    if(shape instanceof Composite) {
        let flag = false;

        DFS(shape.getShapeList(), item => {
            if(ctx.isPointInPath(item.getPath(), x, y)) flag = true;
        }, false);

        return flag;
    }
    else {
        return ctx.isPointInPath(shape.getPath(), x, y);
    }
}

// 判断坐标是否在某个路径上
export function isInPath(ctx: CanvasRenderingContext2D, shape: Shape | Composite, x: number, y: number): boolean {
    if(shape instanceof Composite) {
        let flag = false;

        DFS(shape.getShapeList(), item => {
            if(ctx.isPointInStroke(item.getPath(), x, y)) flag = true;
        }, false);

        return flag;
    }
    else {
        return ctx.isPointInStroke(shape.getPath(), x, y);
    }
}




// 判断是否为凹多边形
export function isConcavePoly(vex: polygonVex): boolean {
    let flag: boolean = false,
        prev: number, cur: number;

    for(let i = 1, len = vex.length; i < len - 1; i++) {
        let v1 = [vex[i][0] - vex[i - 1][0], vex[i][1] - vex[i - 1][1]],
            v2 = [vex[i + 1][0] - vex[i][0], vex[i + 1][1] - vex[i][1]];

        // 计算向量叉积
        cur = Vector.cor(v1, v2) >= 0? 1: -1;

        if(prev !== undefined && prev !== cur) {
            flag = true;
            break; 
        }
        
        prev = cur;
    }

    return flag;
}   


// 将凹多边形分割为多个凸多边形(旋转分割法)
export function divideConcavePoly(vex: polygonVex): Array<polygonVex> {
    // 将拆分出来的多边形保存到这个数组
    let polygonList: Array<polygonVex> = [];

    let i, j, len = vex.length,
        flag = false;

    let polygon1 = <polygonVex>arrayDeepCopy(vex), polygon2 = [];

    for(i = 0, len = vex.length; i < len - 2; i++) {
        let vAxis = [vex[i + 1][0] - vex[i][0], vex[i + 1][1]- vex[i][1]], 
            v = [vex[i + 2][0] - vex[i][0], vex[i + 2][1]- vex[i][1]];

        if(Vector.cor(vAxis, v) < 0) {
            for(j = i + 3; j < len; j++) {
                v = [vex[j][0] - vex[i][0], vex[j][1]- vex[i][1]];
                if(Vector.cor(vAxis, v) > 0) {
                    flag = true;
                    break;
                }
            }

            if(flag) break;
        }
    }

    // 拆分为两个多边形polygon1和polygon2
    let dp1 = polygon1[i + 1],
        dp2 = polygon1[j];

    polygon2 = polygon1.splice(i + 2, j - (i + 2));
    polygon2.unshift(dp1);
    polygon2.push(dp2);

    // 闭合拆分出来的多边形
    closePolyVex(polygon2);

    polygonList.push(polygon1);
    polygonList.push(polygon2);

    // 检测拆分出来的两个多边形是否是凹多边形，若果是，继续递归拆分
    if(isConcavePoly(polygon1)) {
        polygonList = polygonList.concat(divideConcavePoly(polygon1));
    }
    if(isConcavePoly(polygon2)) {
        polygonList = polygonList.concat(divideConcavePoly(polygon2));
    }

    return polygonList;
}


// 判断两条共线线段是否有重叠
export function isOverlaps(line1: number[], line2: number[]): boolean {
    return (line1[1] > line2[0] && line1[0] < line2[1]) || (line2[1] > line1[0] && line2[0] < line1[1]);
}
















































