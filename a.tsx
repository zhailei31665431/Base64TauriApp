import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { useDispatch } from "react-redux";
import EventEmitter from "events";
import { deepCopy, generateMixed, turnKey } from "./utils/pubfun";

import Section from "./editor/section";
import SameTemplate from "./editor/sameTemplate";

import asyncValidator from "async-validator";
import schema from "@/components/pages/CreateLearning/components/livestreaming";

require("./styles/index.scss");

let formChangeQueue: any = [];
let settingQueueTime: any = null;

declare interface Events {
  on: Function;
  emit: Function;
  off: Function;
}

interface FormItemInterface {
  element: string;
  label: string;
  labelHelp?: string;
  name: string;
  value: string | Array<string | number>;
  placeholder: string;
  style?: string;
  className?: string;
  require?: {
    type: number;
    parent: Array<string>;
    options: Array<{ key: string; compare: string; value: string | number }>;
    expression: string;
  };
  disabled?: {
    type: number;
    parent: Array<string>;
    options: Array<{ key: string; compare: string; value: string | number }>;
    expression: string;
  };
  hidden?: {
    status?: number;
    type: number;
    parent: Array<string>;
    options: Array<{ key: string; compare: string; value: string | number }>;
    expression: string;
  };
  show?: { status?: number; type: number; parent: Array<string>; options: Array<{ key: string; compare: string; value: string | number }>; expression: string };
  reset?: Array<any>;
  databind?: "";
  validator?: Array<any>;
  remoteDataUrl?: string;
  options?: Array<{ label: string; value: string | number; id?: string }>;
  error?: Array<string>;
  attr?: any;
  schema?: any;
}
interface FormDataInterface {
  bindOtherData?: any;
  getForm?: any;
  data?: any;
  schema: Array<FormItemInterface>;
  onChange?: any;
  expand?: boolean;
  initTarget?: (form: any) => void;
  initSubmit?: number;
}

enum formula {
  eq = "eq", //等于
  neq = "neq", //不等于
  gt = "gt", //大于
  lt = "lt", //小于
  egt = "egt", //大于等于
  elt = "elt", //小于等于
}

const DecompositionForm = (forms: any, parentData: any) => {
  //平铺数据结构，后续校验使用
  forms.forEach((item: any, index: number) => {
    if (item["element"] === "section" || item["element"] === "combie") {
      if (item["element"] === "section" && typeof item["is_add"] !== "undefined" && item["is_add"] === 1) {
        parentData[item["name"]] = item["value"];
      } else {
        DecompositionForm(item["schema"], parentData);
      }
    } else if (item["element"] === "daterange") {
      if (item["attr"] && item["attr"]["startkey"] && item["attr"]["startkey"].length !== 0 && item["attr"]["endkey"] && item["attr"]["endkey"].length !== 0) {
        parentData[item["attr"]["startkey"]] = item["value"][0];
        parentData[item["attr"]["endkey"]] = item["value"][1];
      } else {
        parentData[item["name"]] = item["value"];
      }
    } else {
      parentData[item["name"]] = item["value"];
    }
  });
};

const initEvents = (schema: any, events: Events) => {
  for (let i in schema) {
    let item = schema[i];
    if (typeof item.require !== "undefined" && typeof item.require.parent !== "undefined" && item.require.parent.length !== 0) {
      item.require.parent.forEach((item1: any) => {
        events.on("form:change:" + item1, (e: Events, data: any) => {
          let type = data["type"];
          if (typeof item["require"] !== "undefined" && typeof item["require"]["options"] !== "undefined" && item["require"]["options"].length !== 0) {
            if (type === "delete") {
              let newArray: Array<any> = [];
              for (let m in item["require"]["options"]) {
                let itemParent = item["require"]["options"][m];
                if (itemParent["key"] !== data["key"]) {
                  newArray.push(i);
                }
              }
              item["require"]["options"] = newArray;
            }
          }
          events.emit("form:events");
        });
      });
    }
    if (typeof item.disabled !== "undefined" && typeof item.disabled.parent !== "undefined" && item.disabled.parent.length !== 0) {
      item.disabled.parent.forEach((item1: any) => {
        events.on("form:change:" + item1, (e: Events, data: any) => {
          let type = data["type"];
          if (typeof item["disabled"] !== "undefined" && typeof item["disabled"]["options"] !== "undefined" && item["disabled"]["options"].length !== 0) {
            if (type === "delete") {
              let newArray: Array<any> = [];
              for (let m in item["disabled"]["options"]) {
                let itemParent = item["disabled"]["options"][m];
                if (itemParent["key"] !== data["key"]) {
                  newArray.push(i);
                }
              }
              item["disabled"]["options"] = newArray;
            }
          }
          events.emit("form:events");
        });
      });
    }
    if (typeof item.hidden !== "undefined" && typeof item.hidden.parent !== "undefined" && item.hidden.parent.length !== 0) {
      item.hidden.parent.forEach((item1: any) => {
        events.on("form:change:" + item1, (e: Events, data: any) => {
          let type = data["type"];
          if (typeof item["hidden"] !== "undefined" && typeof item["hidden"]["options"] !== "undefined" && item["hidden"]["options"].length !== 0) {
            if (type === "delete") {
              let newArray: Array<any> = [];
              for (let m in item["hidden"]["options"]) {
                let itemParent = item["hidden"]["options"][m];
                if (itemParent["key"] !== data["key"]) {
                  newArray.push(i);
                }
              }
              item["hidden"]["options"] = newArray;
            }
          }
          events.emit("form:events");
        });
      });
    }
    if (item.databind && item.databind.length !== 0) {
      item.databind.forEach((item1: any) => {
        events.on("form:change:" + item1, (e: Events, data: any) => {
          let type = data["type"];
          if (type === "change") {
            item["attr"]["refresh"] = 1;
          }
          events.emit("form:events");
        });
      });
    }
  }
  return () => {};
};

export const checkDataa = (data1: any, data2: any, type: string) => {
  //data1 原值  data2 被比较值（options里面的那个value）
  if (Object.prototype.toString.call(data1) === "[object Object]") {
    data1 = data1["id"];
  }
  if (Object.prototype.toString.call(data2) === "[object Object]") {
    data2 = data2["id"];
  }

  if (type === "eq") {
    if (data1 === data2) {
      return 1;
    } else {
      return 0;
    }
  }
  if (type === "neq") {
    if (data1 !== data2) {
      return 1;
    } else {
      return 0;
    }
  }
  if (type === "gt") {
    if (data1 > data2) {
      return 1;
    } else {
      return 0;
    }
  }
  if (type === "gte") {
    if (data1 >= data2) {
      return 1;
    } else {
      return 0;
    }
  }
  if (type === "lt") {
    if (data1 < data2) {
      return 1;
    } else {
      return 0;
    }
  }
  if (type === "le") {
    if (data1 <= data2) {
      return 1;
    } else {
      return 0;
    }
  }
  if (type === "checklength") {
    if (data2 === -1) {
      if (typeof data1 === "undefined" || data1.length === 0) {
        return 1;
      } else {
        return 0;
      }
    } else if (data2 === "!-1") {
      if (typeof data1 !== "undefined" && data1.length !== 0) {
        return 1;
      } else {
        return 0;
      }
    } else {
      if (typeof data1 === "undefined" || typeof data2 === "undefined" || data1.length !== data2) {
        return 1;
      } else {
        return 0;
      }
    }
  }
  if (type === "haddata") {
  }
};

export const ValidateData = (tileData: any, schema: FormItemInterface, list: Array<any>, nosetrule?: boolean) => {
  let value: string | any = schema.value;

  if (schema["element"] === "daterange") {
    let hasValue = Object.values(value).filter((i: any) => i);
    if (hasValue.length !== 0 && value.length !== Object.values(value).filter((i: any) => i).length) {
      let error: any = {
        error: i18n("lms.complete.time.range.error.tip"),
        label: schema.label,
        name: schema.name,
      };
      if (schema["error"] && schema["error"].length !== 0) {
        let hasThisError = schema["error"].filter((item: any) => item["error"]);

        if (hasThisError.length === 0) {
          let newError = [...schema["error"]];
          newError.push(error);
          schema["error"] = newError;
        }
      } else {
        schema["error"] = [error];
      }
      list.push(error);
    }
  } else {
    let type = Object.prototype.toString.call(value);
    if (type === "[object Object]") {
      if (Object.values(value).length === 0) {
        return;
      }
    } else if (type === "[object Array]") {
      if (Object.values(value).length === 0) {
        return;
      }
    } else if (type === "[object String]") {
      if ((value + "").trim().length === 0) {
        return;
      }
    }

    if (typeof schema["validator"] !== "undefined" && schema["validator"].length !== 0) {
      if (schema["element"] === "section" || schema["element"] === "combie") {
      } else {
        const descriptor = {
          value: schema["validator"],
        };
        const validator = new asyncValidator(descriptor);
        validator.validate({ value: value, tileData: tileData }, (errors, fields) => {
          if (errors) {
            for (let i in errors) {
              let error: any = {
                error: errors[i]["message"],
                label: schema.label,
                name: schema.name,
              };
              if (schema["error"] && schema["error"].length !== 0) {
                let hasThisError = schema["error"].filter((item: any) => item["error"]);

                if (hasThisError.length === 0) {
                  let newError = [...schema["error"]];
                  newError.push(error);
                  schema["error"] = newError;
                }
              } else {
                schema["error"] = [error];
              }
              list.push(error);
              break;
            }
          } else {
            // list = [];
            schema.error = [];
          }
        });
      }
    }
  }
};

export const CheckForm = (tileData: any, schema: FormItemInterface, list: Array<any>, nosetrule?: boolean) => {
  if (typeof schema.hidden !== "undefined") {
    let checkHide = checkShowHideDisabledElement("hidden", schema, tileData);
    if (checkHide === 1) {
      return;
    }
  }
  if (typeof schema.show !== "undefined") {
    let checkShow = checkShowHideDisabledElement("show", schema, tileData);
    if (checkShow === 0) {
      return;
    }
  }

  // schema["error"] = [];
  let hasError = false;
  let value: string | any = schema.value;
  const addError = (list: any, schema: any, nosetrule: any) => {
    let error: any = {
      error: i18n("lms.label.required"),
      label: schema.label,
      name: schema.name,
    };
    if (schema["error"] && schema["error"].length !== 0) {
      let newError = [...schema["error"]];
      newError.push(error);
      if (typeof nosetrule === "undefined") {
        schema["error"] = newError;
      }
    } else {
      if (typeof nosetrule === "undefined") {
        schema["error"] = [error];
      }
    }
    list.push(error);
  };

  if (typeof nosetrule === "undefined") {
    schema["error"] = [];
  }

  if (typeof schema.require !== "undefined" && schema.require.type === 1) {
    if (typeof schema.require.parent !== "undefined" && schema.require.parent.length !== 0) {
      let options: Array<any> = schema.require.options;
      let expression: string = schema.require["expression"].replace(/or/gi, "||").replace(/and/gi, "&&");
      options.forEach(function (i: any, index: number) {
        let key = i["key"].split(".")[0];
        let regexp = "{" + index + "\\}";
        let str = new RegExp(regexp, "g");
        let dataBool: any = null;
        if (schema.element === "combie") {
          for (let j in i["value"]) {
            let item = i["value"][j];
            dataBool = checkDataa(tileData[key], item, i["compare"]);
            if (dataBool) {
              break;
            }
          }
        } else {
          dataBool = checkDataa(tileData[key], i["value"], i["compare"]);
        }
        expression = expression.replace(str, dataBool);
      });

      if (eval(expression) && value.length === 0) {
        addError(list, schema, nosetrule);
      } else {
      }
    } else {
      if (typeof value !== "undefined") {
        let valueType: string = Object.prototype.toString.call(value);
        if (valueType === "[object Object]") {
          if (schema.element === "combie") {
            let checkerror = Object.values(value).filter((i: any) => {
              if (Object.prototype.toString.call(i) === "[object Object]") {
                return i["id"];
              } else {
                return i;
              }
            });
            if (checkerror.length !== schema.schema.length) {
              addError(list, schema, nosetrule);
            }
          } else {
            if (
              Object.values(value).filter((i: any) => {
                if (Object.prototype.toString.call(i) === "[object Object]") {
                  return i["id"];
                } else {
                  return i;
                }
              }).length === 0
            ) {
              addError(list, schema, nosetrule);
            }
          }
        } else if (valueType === "[object Array]") {
          value = value.filter((i: any) => i);
          if (value.length === 0) {
            addError(list, schema, nosetrule);
          }
        } else {
          if ((value + "").trim().length === 0) {
            addError(list, schema, nosetrule);
          }
        }
      } else {
        addError(list, schema, nosetrule);
      }
    }
  }

  ValidateData(tileData, schema, list, nosetrule);
};

export const checkShowHideDisabledElement = (key: string, schema: any, tileData: any): number => {
  let value = schema["value"];
  let status = 0;
  if (typeof schema[key] !== "undefined" && schema[key].type === 1) {
    if (typeof schema[key].parent === "undefined" || schema[key].parent.length === 0) {
      status = 1;
    } else {
      let options: Array<any> = schema[key].options;
      let expression: string = schema[key]["expression"].toString().replace(/or/gi, "||").replace(/and/gi, "&&");
      options.forEach(function (i: any, index: number) {
        let key = i["key"].split(".")[0];
        let regexp = "{" + index + "\\}";
        let str = new RegExp(regexp, "g");
        let dataBool: any = null;
        if (schema.element === "combie") {
          for (let j in i["value"]) {
            let item = i["value"][j];
            dataBool = checkDataa(tileData[key], item, i["compare"]);
            if (dataBool) {
              break;
            }
          }
        } else {
          dataBool = checkDataa(tileData[key], i["value"], i["compare"]);
        }
        expression = expression.replace(str, dataBool);
      });

      if (schema["name"] === "business_category") {
        console.log(expression, "asdasd");
      }
      if (eval(expression)) {
        status = 1;
      } else {
        status = 0;
      }
    }
    schema[key]["status"] = status;
  }

  return status;
};

export const CheckSchema = (tileData: any, schema: any, list: Array<any>, nosetrule?: boolean) => {
  for (let i in schema) {
    let item = schema[i];
    if (item["element"] === "section") {
      if (item["element"] === "section" && typeof item["is_add"] !== "undefined" && item["is_add"] === 1) {
        item.value.forEach((item: any, index: number) => {
          item["value"] = CheckForm(tileData, item, list, nosetrule);
        });
      } else {
        // CheckForm(tileData, item, list, nosetrule);
        CheckSchema(tileData, item.schema, list, nosetrule);
      }
    } else if (item["element"] === "combie") {
      if (typeof item.require !== "undefined" && item.require.type === 1) {
        CheckForm(tileData, item, list, nosetrule);
      } else {
        CheckSchema(tileData, item.schema, list, nosetrule);
      }
    } else {
      CheckForm(tileData, item, list, nosetrule);
    }
  }
};

export const ResetData = (tileData: any, schema: FormItemInterface, onChange: any) => {
  let options: any = schema.reset;
  let changeDataStatus: boolean = false;
  let changeData: any = null;
  for (let index in options) {
    let i = options[index];
    let key = i["key"].split(".")[0];
    let regexp = "{" + index + "\\}";
    let str = new RegExp(regexp, "g");
    let dataBool: any = null;
    if (schema.element === "combie") {
      for (let j in i["value"]) {
        let item = i["value"][j];
        dataBool = checkDataa(tileData[key], item, i["compare"]);
      }
    } else {
      dataBool = checkDataa(tileData[key], i["value"], i["compare"]);
    }
    if (dataBool) {
      changeDataStatus = true;
      changeData = i["change"];
      break;
    }
  }
  if (changeDataStatus === true) {
    onChange(schema.name, {
      value: changeData,
    });
    schema["value"] = changeData;
    // console.log(changeData, schema, "12312312312312312312312");
  }
};

export const InitChildForm = (data: FormItemInterface, events: Event, onChange?: any, tileData?: any, expand?: boolean) => {
  const [mount, setMount] = useState(0);
  useEffect(() => {
    setMount(1);
    return () => {};
  }, []);

  if (typeof data.hidden !== "undefined") {
    let checkHide = checkShowHideDisabledElement("hidden", data, tileData);
    if (checkHide === 1) {
      return;
    }
  }
  if (typeof data.show !== "undefined") {
    let checkShow = checkShowHideDisabledElement("show", data, tileData);
    if (checkShow === 0) {
      return;
    }
  }

  let checkDisabledBoolean: number = checkShowHideDisabledElement("disabled", data, tileData);
  data["attr"] = Object.assign(data["attr"] || {}, { disabled: checkDisabledBoolean === 1 ? true : false });

  switch (data["element"]) {
    case "section":
      return <Section key={data["name"]} schema={data} events={events} onChange={onChange} tileData={tileData} expand={expand} />;
      break;
    case "combie":
      return <Section key={data["name"]} schema={data} events={events} onChange={onChange} tileData={tileData} />;
      break;
    default:
      return <SameTemplate key={data["name"]} schema={data} events={events} onChange={onChange} tileData={tileData} />;
      break;
  }
};

const App = (props: FormDataInterface, ref: any): any => {
  const self = this;
  const formid: string = generateMixed(32);
  const events: any = new EventEmitter();

  const [mount, setMount] = useState(0);

  const [expand, updateExpand] = useState(props.expand || -1);

  (window as any)["eventss"] = events;
  let saveLevelData = {};
  const propsOnChange = props.onChange;
  const [schema, updateSchema] = useState(props.schema);

  const [tileData, updateTileData] = useState(() => {
    let normalTileData = {};
    DecompositionForm(schema, normalTileData);
    return normalTileData;
  });

  const onChange = (name: string, data: any) => {
    const index = formChangeQueue.findIndex((i: any) => i.name === name);
    if (index !== -1) {
      formChangeQueue[index]["data"] = data;
    } else {
      formChangeQueue.push({
        name: name,
        data: data,
      });
    }
    // console.error(Date.parse(new Date().toString()) / 1000, name, data["value"], "123");
    clearTimeout(settingQueueTime);
    settingQueueTime = setTimeout(() => {
      console.log(JSON.parse(JSON.stringify(formChangeQueue)), "123");

      let newBackSchema: Array<any> = [];
      schema.forEach((item: any) => {
        let hasQueueData = formChangeQueue.find((i: any) => i["name"] === item["name"]);
        if (hasQueueData) {
          let newItem = { ...item, ...hasQueueData["data"], ...{ error: [] } };
          newBackSchema.push({ ...newItem });
        } else {
          newBackSchema.push({ ...item });
        }
      });
      formChangeQueue = [];
      updateSchema([...newBackSchema]);
      let normalTileData: any = {};
      DecompositionForm(newBackSchema, normalTileData);

      updateTileData(normalTileData);
      let checkerror: Array<any> = [];
      CheckSchema(normalTileData, newBackSchema, checkerror, false);

      propsOnChange &&
        propsOnChange({
          schema: newBackSchema,
          error: checkerror,
          tileData: normalTileData,
        });
    }, 10);
  };

  const checkData = () => {
    let checkerror: Array<any> = [];
    CheckSchema(tileData, schema, checkerror);
    if (checkerror.length !== 0) {
      let newSchema = [...schema];
      updateSchema(newSchema);
      return checkerror;
    } else {
      return checkerror;
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      submit(noShowError?: boolean) {
        // if()
        let check: Array<any> = [];
        if (typeof noShowError === "undefined") {
          check = checkData();
        } else {
          CheckSchema(tileData, schema, check, false);
        }
        return {
          error: check,
          schema: schema,
          tileData: tileData,
        };
      },
      getData() {
        let checkerror: Array<any> = [];
        CheckSchema(tileData, schema, checkerror, false);
        return {
          error: checkerror,
          schema: schema,
          tileData: tileData,
        };
      },
      setSchema(bbb: any) {
        let obj = deepCopy(bbb);
        let newSchema = [...bbb];
        let normalTileData = {};
        DecompositionForm(newSchema, normalTileData);
        updateTileData(normalTileData);
        updateSchema(newSchema);
      },
    }),
    [schema, tileData]
  );

  useEffect(() => {
    // if (mount === 1) {
    //   updateSchema(props.schema);
    // }
  }, props.schema);

  useEffect(() => {
    document.addEventListener("wheel", function (event) {
      if ((document as any).activeElement.type === "number") {
        (document as any).activeElement.blur();
      }
    });
    if (typeof props.initSubmit !== "undefined" && props.initSubmit === 1) {
      let checkerror: Array<any> = [];
      CheckSchema(tileData, schema, checkerror);
      propsOnChange &&
        propsOnChange({
          schema: schema,
          error: checkerror,
          tileData: tileData,
        });
    }
    setMount(1);

    return () => {};
  }, []);

  if (typeof props.initTarget !== "undefined") {
    props.initTarget({
      submit: () => {
        let check: Array<any> = checkData();
        return {
          error: check,
          schema: schema,
          tileData: tileData,
        };
      },
      getData: () => {
        let checkerror: Array<any> = [];
        CheckSchema(tileData, schema, checkerror, false);
        return {
          error: checkerror,
          schema: schema,
          tileData: tileData,
        };
      },
    });
  }

  const list = schema.map((item: any, index: number) => {
    let newTileData = { ...tileData };
    if (typeof props.bindOtherData !== "undefined") {
      newTileData = Object.assign({}, props.bindOtherData, newTileData);
    }
    return InitChildForm(item, events, onChange, newTileData, expand as boolean);
  });

  return <div className="lms-form">{list}</div>;
};

export default forwardRef(App);
