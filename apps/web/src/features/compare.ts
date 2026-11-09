export type ComparableFinding={ruleId:string;filePath:string};
function identity(f:ComparableFinding){const path=f.filePath.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/(^|\/)\.\//g,'$1').replace(/\/$/,'');return `${f.ruleId}:${path}`;}
export function compareFindings(current:ComparableFinding[],selectedPrevious:ComparableFinding[],olderScans:ComparableFinding[][]){
 const currentIds=new Set(current.map(identity)),previousIds=new Set(selectedPrevious.map(identity)),olderIds=new Set(olderScans.flat().map(identity));
 return {newCount:[...currentIds].filter(id=>!previousIds.has(id)&&!olderIds.has(id)).length,existingCount:[...currentIds].filter(id=>previousIds.has(id)).length,resolvedCount:[...previousIds].filter(id=>!currentIds.has(id)).length,reintroducedCount:[...currentIds].filter(id=>!previousIds.has(id)&&olderIds.has(id)).length};
}
