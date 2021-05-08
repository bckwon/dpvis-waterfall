function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function filter_only_transitions(array){
  var array = array;
  var new_array = [];
  var last_element = false;
  array.forEach(function(element, index){
    if(index == 0){
      new_array.push(element);
    }else if(index == array.length-1){
      if(!last_element){
        new_array.push(element);
      }
    }else if(array[index]["state"] != array[index+1]["state"]){
      new_array.push(element);
      new_array.push(array[index+1]);
      if(index == array.length - 2){
        last_element = true;
      }
    }
  })
  return new_array;
}